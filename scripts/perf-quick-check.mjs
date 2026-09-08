#!/usr/bin/env node
/**
 * perf-quick-check.mjs — fast before/after check for specific pages
 * 5 cold runs per page, fast connection only
 *
 * Measures both LCP (technical) and "visually settled" (perceived):
 * - LCP: when the largest content element paints
 * - Settled: when the page stops changing — last of:
 *   layout shift, DOM mutation, or network fetch — plus a 200ms quiet buffer
 */
import { chromium } from '@playwright/test';

const BASE_URL = 'https://jobnewssa.vercel.app';
const RUNS = 5;
const PAUSE_MS = 1000;

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
  // Track network fetches (XHR + fetch) completing
  try {
    new PerformanceObserver(list => {
      for (const e of list.getEntries()) {
        mark(e.responseEnd || (e.startTime + e.duration));
      }
    }).observe({ type: 'resource', buffered: true });
  } catch (_) {}
  // Track DOM mutations — any insert/attribute change extends settlement
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

async function measure(browser, url) {
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  await page.addInitScript(OBSERVER_SCRIPT);
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 60_000 });
    // Wait for visual settlement: poll until lastActivity hasn't changed for 200ms
    // (i.e. no new layout shifts, DOM mutations, or network responses for 200ms).
    // Cap at 5s to avoid hanging on pages with perpetual animations.
    let settled = false;
    let settledTime = 0;
    for (let attempt = 0; attempt < 25; attempt++) {
      await page.waitForTimeout(200);
      const snapshot = await page.evaluate(() => ({
        lastActivity: window.__vitals.lastActivity,
        now: performance.now(),
      }));
      if (snapshot.now - snapshot.lastActivity >= 200) {
        settled = true;
        settledTime = Math.round(snapshot.lastActivity);
        break;
      }
    }
    // Extra 200ms quiet buffer after settlement for any trailing paints
    await page.waitForTimeout(200);
    const data = await page.evaluate((fallbackSettled) => {
      const nav = performance.getEntriesByType('navigation')[0];
      if (!nav) return null;
      const paints = {};
      for (const p of performance.getEntriesByType('paint')) paints[p.name] = p.startTime;
      const v = window.__vitals;
      return {
        ttfb: Math.round(nav.responseStart),
        fp: Math.round(paints['first-paint'] || 0),
        lcp: Math.round(v.lcp || 0),
        cls: Math.round(v.cls * 1000) / 1000,
        tbt: Math.round(v.tbt || 0),
        settled: fallbackSettled || Math.round(v.lastActivity),
      };
    }, settledTime);
    return data || { failed: true };
  } catch (e) {
    return { failed: true, error: e.message };
  } finally {
    await ctx.close();
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  // Discover slug
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  const p = await ctx.newPage();
  await p.goto(`${BASE_URL}/jobs`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const href = await p.evaluate(() => document.querySelector('a[href^="/jobs/"]')?.getAttribute('href'));
  await ctx.close();
  const slug = href?.replace('/jobs/', '').split('?')[0] || 'unknown';

  const PAGES = [
    { label: '/', path: '/' },
    { label: '/jobs', path: '/jobs' },
    { label: '/jobs?sector=Technology', path: '/jobs?sector=Technology' },
    { label: `/jobs/${slug}`, path: `/jobs/${slug}` },
    { label: '/news', path: '/news' },
    { label: '/auth/login', path: '/auth/login' },
  ];

  console.log(`\nQuick perf check — ${RUNS} cold runs, fast connection`);
  console.log(`Measuring: LCP (technical) + Settled (perceived, last activity + 200ms quiet)\n`);
  console.log('Page'.padEnd(35) + 'TTFB'.padStart(8) + 'LCP'.padStart(8) + 'Settled'.padStart(10) + 'CLS'.padStart(8) + 'Gap'.padStart(8));
  console.log('-'.repeat(77));

  for (const pg of PAGES) {
    const results = [];
    for (let i = 0; i < RUNS; i++) {
      const r = await measure(browser, `${BASE_URL}${pg.path}`);
      results.push(r);
      if (i < RUNS - 1) await sleep(PAUSE_MS);
    }
    const good = results.filter(r => !r.failed);
    if (good.length) {
      const medTTFB = median(good.map(r => r.ttfb));
      const medLCP = median(good.map(r => r.lcp));
      const medSettled = median(good.map(r => r.settled));
      const medCLS = median(good.map(r => r.cls));
      const gap = medSettled - medLCP;
      console.log(
        pg.label.padEnd(35) +
        `${medTTFB}ms`.padStart(8) +
        `${medLCP}ms`.padStart(8) +
        `${medSettled}ms`.padStart(10) +
        `${medCLS}`.padStart(8) +
        `+${gap}ms`.padStart(8)
      );
    } else {
      console.log(pg.label.padEnd(35) + 'ALL FAILED');
    }
  }

  // Client nav test
  console.log('\nClient-side navigation (wall-clock + settled):');
  console.log('Route'.padEnd(35) + 'Nav'.padStart(8) + 'Settled'.padStart(10));
  console.log('-'.repeat(53));

  for (const nav of [
    { label: 'Home → /jobs', start: '/', click: 'a[href="/jobs"]', expect: '**/jobs' },
    { label: '/jobs → detail', start: '/jobs', click: `a[href="/jobs/${slug}"]`, expect: `**/jobs/${slug}` },
  ]) {
    const navTimes = [];
    const settledTimes = [];
    for (let i = 0; i < RUNS; i++) {
      const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
      const page = await ctx.newPage();
      await page.addInitScript(OBSERVER_SCRIPT);
      try {
        await page.goto(`${BASE_URL}${nav.start}`, { waitUntil: 'load', timeout: 60000 });
        // Wait for initial page to settle
        await page.waitForTimeout(2000);
        // Reset activity tracker before navigation
        await page.evaluate(() => { window.__vitals.lastActivity = performance.now(); });
        const el = await page.$(nav.click);
        if (!el) { await ctx.close(); continue; }
        const t0 = Date.now();
        await Promise.all([page.waitForURL(nav.expect, { timeout: 15000 }), el.click()]);
        const navTime = Date.now() - t0;
        navTimes.push(navTime);
        // Wait for settlement after client nav
        let settledTime = navTime;
        for (let attempt = 0; attempt < 25; attempt++) {
          await page.waitForTimeout(200);
          const snap = await page.evaluate(() => ({
            lastActivity: window.__vitals.lastActivity,
            now: performance.now(),
          }));
          if (snap.now - snap.lastActivity >= 200) {
            settledTime = Date.now() - t0;
            break;
          }
        }
        settledTimes.push(settledTime);
      } catch (e) {
        // skip
      }
      await ctx.close();
      if (i < RUNS - 1) await sleep(PAUSE_MS);
    }
    if (navTimes.length) {
      console.log(
        nav.label.padEnd(35) +
        `${median(navTimes)}ms`.padStart(8) +
        `${median(settledTimes)}ms`.padStart(10)
      );
    } else {
      console.log(nav.label.padEnd(35) + 'FAILED');
    }
  }

  await browser.close();
  console.log('\nDone.');
}

main().catch(e => { console.error(e); process.exit(1); });
