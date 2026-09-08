#!/usr/bin/env node
/**
 * perf-auth-compare.mjs — Compare page performance signed-out vs signed-in
 * Uses stored Playwright auth state to measure the authenticated overhead.
 *
 * Measures both LCP (technical) and "visually settled" (perceived):
 * - Settled = last of: layout shift, DOM mutation, network fetch + 200ms quiet
 */
import { chromium } from '@playwright/test';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'https://jobnewssa.vercel.app';
const RUNS = 5;
const PAUSE_MS = 800;

const OBSERVER_SCRIPT = `
(function () {
  window.__vitals = { lcp: 0, cls: 0, tbt: 0, lastActivity: 0 };
  const mark = (t) => { window.__vitals.lastActivity = Math.max(window.__vitals.lastActivity, t); };
  try {
    new PerformanceObserver(list => {
      for (const e of list.getEntries()) {
        window.__vitals.lcp = e.startTime;
        mark(e.startTime);
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (_) {}
  try {
    new PerformanceObserver(list => {
      for (const e of list.getEntries()) {
        if (!e.hadRecentInput) {
          window.__vitals.cls += e.value;
          mark(e.startTime);
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch (_) {}
  try {
    new PerformanceObserver(list => {
      for (const e of list.getEntries()) {
        if (e.duration > 50) window.__vitals.tbt += (e.duration - 50);
        mark(e.startTime + e.duration);
      }
    }).observe({ type: 'longtask', buffered: true });
  } catch (_) {}
  try {
    new PerformanceObserver(list => {
      for (const e of list.getEntries()) {
        mark(e.responseEnd || (e.startTime + e.duration));
      }
    }).observe({ type: 'resource', buffered: true });
  } catch (_) {}
  try {
    const mo = new MutationObserver(() => { mark(performance.now()); });
    mo.observe(document.documentElement, {
      childList: true, subtree: true, attributes: true
    });
  } catch (_) {}
})();
`;

const sleep = ms => new Promise(r => setTimeout(r, ms));
function median(arr) {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

async function measure(browser, url, storageState) {
  const ctxOpts = { ignoreHTTPSErrors: true };
  if (storageState) ctxOpts.storageState = storageState;
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  await page.addInitScript(OBSERVER_SCRIPT);

  try {
    await page.goto(url, { waitUntil: 'load', timeout: 30_000 });
    // Wait for visual settlement: poll until lastActivity hasn't changed for 200ms
    let settledTime = 0;
    for (let attempt = 0; attempt < 25; attempt++) {
      await page.waitForTimeout(200);
      const snap = await page.evaluate(() => ({
        lastActivity: window.__vitals.lastActivity,
        now: performance.now(),
      }));
      if (snap.now - snap.lastActivity >= 200) {
        settledTime = Math.round(snap.lastActivity);
        break;
      }
    }
    await page.waitForTimeout(200);

    const data = await page.evaluate((fallbackSettled) => {
      const nav = performance.getEntriesByType('navigation')[0];
      if (!nav) return null;
      const v = window.__vitals;
      return {
        ttfb: Math.round(nav.responseStart),
        lcp: Math.round(v.lcp || 0),
        cls: Math.round(v.cls * 1000) / 1000,
        settled: fallbackSettled || Math.round(v.lastActivity),
      };
    }, settledTime);
    if (!data) return { failed: true };
    return data;
  } catch (e) {
    return { failed: true, error: e.message };
  } finally {
    await ctx.close();
  }
}

async function measureSet(browser, label, url, storageState, runs) {
  const results = [];
  for (let i = 0; i < runs; i++) {
    const r = await measure(browser, url, storageState);
    results.push(r);
    if (i < runs - 1) await sleep(PAUSE_MS);
  }
  const good = results.filter(r => !r.failed);
  if (good.length >= 2) {
    return {
      ttfb: median(good.map(r => r.ttfb)),
      lcp: median(good.map(r => r.lcp)),
      settled: median(good.map(r => r.settled)),
      cls: median(good.map(r => r.cls)),
    };
  }
  return null;
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  // Load auth state
  const seekerPath = resolve(__dirname, '../tests/.auth/seeker.json');
  const TEST_EMAIL = process.env.TEST_SEEKER_EMAIL || 'joao.f.fernandes@clevercorporate.com';
  const TEST_PASSWORD = process.env.TEST_SEEKER_PASSWORD || 'yourfathereatspussy';

  console.log('\nLogging in to get fresh auth state...');
  let seekerState = null;
  const loginCtx = await browser.newContext({ ignoreHTTPSErrors: true });
  const loginPage = await loginCtx.newPage();
  try {
    await loginPage.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await loginPage.getByLabel('Email').fill(TEST_EMAIL);
    await loginPage.locator('#login-password').fill(TEST_PASSWORD);
    await loginPage.getByRole('button', { name: 'Sign in' }).click();
    await loginPage.waitForTimeout(10000);
    const finalUrl = loginPage.url();
    console.log(`  Post-login URL: ${finalUrl}`);
    if (!finalUrl.includes('/jobs')) {
      throw new Error(`Login did not redirect to /jobs — landed on ${finalUrl}`);
    }
    seekerState = await loginCtx.storageState();
    console.log(`Auth OK — logged in as ${TEST_EMAIL} (${seekerState.cookies.length} cookies)`);
    const { writeFileSync, mkdirSync } = await import('fs');
    mkdirSync(resolve(__dirname, '../tests/.auth'), { recursive: true });
    writeFileSync(seekerPath, JSON.stringify(seekerState, null, 2));
  } catch (e) {
    console.log('Login failed:', e.message);
    console.log('Will measure signed-out only.');
  }
  await loginCtx.close();

  // Discover a job slug
  const discCtx = await browser.newContext({ ignoreHTTPSErrors: true });
  const discPage = await discCtx.newPage();
  await discPage.goto(`${BASE_URL}/jobs`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  const href = await discPage.evaluate(() => document.querySelector('a[href^="/jobs/"]')?.getAttribute('href'));
  await discCtx.close();
  const slug = href?.replace('/jobs/', '').split('?')[0] || 'unknown';

  const PUBLIC_PAGES = [
    { label: 'Homepage (/)', path: '/' },
    { label: '/jobs', path: '/jobs' },
    { label: `/jobs/${slug.slice(0, 30)}...`, path: `/jobs/${slug}` },
    { label: '/news', path: '/news' },
  ];

  const AUTH_PAGES = [
    { label: '/messages', path: '/messages' },
    { label: '/profile/edit', path: '/profile/edit' },
    { label: '/account/settings', path: '/account/settings' },
    { label: '/applications', path: '/applications' },
    { label: '/employer/dashboard', path: '/employer/dashboard' },
  ];

  const col = { page: 30, num: 9 };
  const hdr = (s, w) => s.padEnd(w);
  const num = (s, w) => s.padStart(w);

  console.log(`\n${'='.repeat(100)}`);
  console.log('PART 1: Public pages — signed-out vs signed-in');
  console.log(`${'='.repeat(100)}`);
  console.log(
    hdr('Page', col.page) +
    num('Out TTFB', col.num) + num('Out LCP', col.num) + num('Out Stl', col.num) +
    num('In TTFB', col.num) + num('In LCP', col.num) + num('In Stl', col.num) +
    num('LCP Δ', col.num) + num('Stl Δ', col.num)
  );
  console.log('-'.repeat(100));

  const results = [];
  for (const pg of PUBLIC_PAGES) {
    process.stdout.write(`${pg.label.padEnd(col.page)}`);
    const out = await measureSet(browser, 'OUT', `${BASE_URL}${pg.path}`, null, RUNS);
    let inn = null;
    if (seekerState) {
      inn = await measureSet(browser, 'IN', `${BASE_URL}${pg.path}`, seekerState, RUNS);
    }
    const fmt = (v) => v != null ? `${v}ms` : '—';
    const delta = (a, b) => {
      if (a == null || b == null) return '—';
      const d = b - a;
      return `${d > 0 ? '+' : ''}${d}ms`;
    };
    console.log(
      num(fmt(out?.ttfb), col.num) + num(fmt(out?.lcp), col.num) + num(fmt(out?.settled), col.num) +
      num(fmt(inn?.ttfb), col.num) + num(fmt(inn?.lcp), col.num) + num(fmt(inn?.settled), col.num) +
      num(delta(out?.lcp, inn?.lcp), col.num) + num(delta(out?.settled, inn?.settled), col.num)
    );
    results.push({ page: pg.label, signedOut: out, signedIn: inn });
  }

  if (seekerState) {
    console.log(`\n${'='.repeat(100)}`);
    console.log('PART 2: Auth-only pages (signed-in only)');
    console.log(`${'='.repeat(100)}`);
    console.log(
      hdr('Page', col.page) +
      num('TTFB', col.num) + num('LCP', col.num) + num('Settled', col.num) + num('CLS', col.num)
    );
    console.log('-'.repeat(66));

    for (const pg of AUTH_PAGES) {
      process.stdout.write(`${pg.label.padEnd(col.page)}`);
      const inn = await measureSet(browser, 'IN', `${BASE_URL}${pg.path}`, seekerState, RUNS);
      const fmt = (v) => v != null ? `${v}ms` : '—';
      if (inn) {
        console.log(
          num(fmt(inn.ttfb), col.num) + num(fmt(inn.lcp), col.num) +
          num(fmt(inn.settled), col.num) + num(`${inn.cls}`, col.num)
        );
      } else {
        console.log('  FAILED');
      }
      results.push({ page: pg.label, signedOut: null, signedIn: inn });
    }
  }

  await browser.close();
  console.log('\nDone.');
}

main().catch(e => { console.error(e); process.exit(1); });
