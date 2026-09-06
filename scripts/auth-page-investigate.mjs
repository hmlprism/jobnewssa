#!/usr/bin/env node
/**
 * auth-page-investigate.mjs
 *
 * Loads /profile/edit (seeker) and /employer/dashboard (employer) with real
 * auth cookies from tests/.auth/*.json and collects:
 *
 * 1. Full performance timeline (TTFB, FP, LCP, CLS, TBT, LoAF/longtask)
 * 2. LCP element identity (tagName, id, className, textContent snippet)
 * 3. CLS breakdown: which elements shift, by how much, and when
 * 4. React hydration warnings from the browser console
 * 5. Resource waterfall showing what loads after FP
 * 6. Screenshot before hydration (immediately after paint) and after settle
 *
 * Outputs a markdown report to perf-results/auth-investigate.md
 */

import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT     = resolve(__dirname, '..');
const OUT_DIR  = resolve(ROOT, 'perf-results');
const BASE_URL = 'https://jobnewssa.vercel.app';

mkdirSync(OUT_DIR, { recursive: true });

// ── Observers injected before each navigation ─────────────────────────────

const OBSERVER_SCRIPT = `
(function () {
  window.__inv = {
    lcp: 0, lcpEl: null,
    cls: 0, clsEntries: [],
    tbt: 0, longTasks: [],
    loaf: [],
    fp: 0, fcp: 0,
    hydrationWarnings: [],
    reactErrors: [],
  };

  // LCP — store element details
  try {
    new PerformanceObserver(list => {
      for (const e of list.getEntries()) {
        window.__inv.lcp = e.startTime;
        window.__inv.lcpEl = e.element ? {
          tag:   e.element.tagName,
          id:    e.element.id || '(none)',
          cls:   e.element.className || '(none)',
          text:  (e.element.textContent || '').trim().slice(0, 80),
          rect:  JSON.stringify(e.element.getBoundingClientRect()),
          url:   e.url || '',
          size:  e.size,
        } : null;
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch(_) {}

  // CLS — record each shift
  try {
    new PerformanceObserver(list => {
      for (const e of list.getEntries()) {
        if (e.hadRecentInput) continue;
        window.__inv.cls += e.value;
        const sources = [];
        for (const s of (e.sources || [])) {
          if (!s.node) continue;
          sources.push({
            tag:       s.node.tagName,
            id:        s.node.id || '(none)',
            cls:       s.node.className || '(none)',
            text:      (s.node.textContent || '').trim().slice(0, 60),
            previous:  JSON.stringify(s.previousRect),
            current:   JSON.stringify(s.currentRect),
          });
        }
        window.__inv.clsEntries.push({
          time:    e.startTime,
          value:   e.value,
          sources,
        });
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch(_) {}

  // Long Tasks / TBT
  try {
    new PerformanceObserver(list => {
      for (const e of list.getEntries()) {
        window.__inv.longTasks.push({ start: Math.round(e.startTime), dur: Math.round(e.duration) });
        if (e.duration > 50) window.__inv.tbt += (e.duration - 50);
      }
    }).observe({ type: 'longtask', buffered: true });
  } catch(_) {}

  // Paints
  try {
    new PerformanceObserver(list => {
      for (const e of list.getEntries()) {
        if (e.name === 'first-paint')             window.__inv.fp  = e.startTime;
        if (e.name === 'first-contentful-paint')  window.__inv.fcp = e.startTime;
      }
    }).observe({ type: 'paint', buffered: true });
  } catch(_) {}

  // Intercept React hydration warnings via console.error
  const _origError = console.error.bind(console);
  console.error = (...args) => {
    const msg = args.map(a => String(a)).join(' ');
    if (
      msg.includes('Hydration') || msg.includes('hydration') ||
      msg.includes('did not match') || msg.includes('server HTML')
    ) {
      window.__inv.hydrationWarnings.push(msg.slice(0, 300));
    }
    _origError(...args);
  };
})();
`;

// ── Helpers ───────────────────────────────────────────────────────────────

function fmtMs(n) { return n == null ? 'N/A' : `${Math.round(n)} ms`; }
function fmtCls(n) { return n == null ? 'N/A' : n.toFixed(4); }

async function investigate(browser, label, url, storageStatePath) {
  console.log(`\n── ${label} ──`);
  console.log(`  URL: ${url}`);

  const ctx  = await browser.newContext({
    ignoreHTTPSErrors: true,
    storageState: storageStatePath,
  });
  const page = await ctx.newPage();

  await page.addInitScript(OBSERVER_SCRIPT);

  // CDP for nav timing fidelity
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');

  // Collect console messages
  const consoleMsgs = [];
  page.on('console', msg => {
    consoleMsgs.push({ type: msg.type(), text: msg.text().slice(0, 300) });
  });

  // Collect network requests (for resource waterfall)
  const networkRequests = [];
  cdp.on('Network.responseReceived', ({ response }) => {
    networkRequests.push({
      url:          response.url.replace(BASE_URL, ''),
      status:       response.status,
      mimeType:     response.mimeType,
      cacheControl: response.headers['cache-control'] || response.headers['Cache-Control'] || '',
      xVercel:      response.headers['x-vercel-cache'] || '',
    });
  });

  try {
    await page.goto(url, { waitUntil: 'load', timeout: 60_000 });

    // Capture screenshot immediately after load (before long tasks settle)
    const ssAfterLoad = resolve(OUT_DIR, `${label.replace(/[^a-z0-9]/gi, '-')}-after-load.png`);
    await page.screenshot({ path: ssAfterLoad, fullPage: false });
    console.log(`  Screenshot after load: ${ssAfterLoad}`);

    // Wait for LCP / CLS / long tasks to settle
    await page.waitForTimeout(3000);

    // Capture screenshot after settle
    const ssAfterSettle = resolve(OUT_DIR, `${label.replace(/[^a-z0-9]/gi, '-')}-after-settle.png`);
    await page.screenshot({ path: ssAfterSettle, fullPage: false });
    console.log(`  Screenshot after settle: ${ssAfterSettle}`);

    // Collect all measurements
    const data = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      if (!nav) return null;
      const resources = performance.getEntriesByType('resource').map(r => ({
        name:     r.name.replace(location.origin, ''),
        type:     r.initiatorType,
        start:    Math.round(r.startTime),
        dur:      Math.round(r.duration),
        bytes:    r.transferSize || 0,
        blocking: r.renderBlockingStatus || 'unknown',
      }));
      return {
        ttfb:           Math.round(nav.responseStart),
        domInteractive: Math.round(nav.domInteractive),
        domComplete:    Math.round(nav.domComplete),
        loadEvent:      Math.round(nav.loadEventEnd),
        transferSize:   nav.transferSize,
        ...window.__inv,
        resources,
      };
    });

    if (!data) throw new Error('Navigation timing unavailable');

    // Print summary to console
    console.log(`  TTFB:           ${fmtMs(data.ttfb)}`);
    console.log(`  FP:             ${fmtMs(data.fp)}`);
    console.log(`  FCP:            ${fmtMs(data.fcp)}`);
    console.log(`  LCP:            ${fmtMs(data.lcp)}`);
    console.log(`  CLS:            ${fmtCls(data.cls)}`);
    console.log(`  TBT:            ${fmtMs(data.tbt)}`);
    console.log(`  domInteractive: ${fmtMs(data.domInteractive)}`);
    console.log(`  domComplete:    ${fmtMs(data.domComplete)}`);
    console.log(`  loadEvent:      ${fmtMs(data.loadEvent)}`);
    console.log(`  HTML transfer:  ${((data.transferSize||0)/1024).toFixed(1)} kB`);

    if (data.lcpEl) {
      console.log(`  LCP element:    <${data.lcpEl.tag}> "${data.lcpEl.text}"`);
      console.log(`                  id="${data.lcpEl.id}" size=${data.lcpEl.size}`);
    }

    if (data.hydrationWarnings?.length) {
      console.log(`  ⚠ Hydration warnings: ${data.hydrationWarnings.length}`);
      for (const w of data.hydrationWarnings) console.log(`    ${w}`);
    } else {
      console.log(`  ✓ No hydration warnings`);
    }

    if (data.clsEntries?.length) {
      console.log(`  CLS entries (${data.clsEntries.length}):`);
      for (const e of data.clsEntries) {
        console.log(`    t=${Math.round(e.time)}ms  value=${e.value.toFixed(4)}`);
        for (const s of (e.sources || [])) {
          console.log(`      <${s.tag}> "${s.text.slice(0,50)}" prev=${s.previous} → curr=${s.current}`);
        }
      }
    }

    if (data.longTasks?.length) {
      console.log(`  Long tasks (>50ms):`);
      for (const t of data.longTasks.filter(t => t.dur > 50)) {
        console.log(`    t=${t.start}ms  dur=${t.dur}ms`);
      }
    }

    // Console errors
    const errors = consoleMsgs.filter(m => m.type === 'error');
    const warnings = consoleMsgs.filter(m => m.type === 'warning');
    if (errors.length) {
      console.log(`  Console errors (${errors.length}):`);
      for (const e of errors.slice(0, 5)) console.log(`    [error] ${e.text}`);
    }
    if (warnings.length) {
      console.log(`  Console warnings (${warnings.length}):`);
      for (const w of warnings.slice(0, 5)) console.log(`    [warn] ${w.text}`);
    }

    // Resource waterfall — first 25, sorted by start
    const sorted = [...(data.resources || [])].sort((a, b) => a.start - b.start).slice(0, 25);
    console.log(`\n  Resource waterfall (first 25):`);
    console.log(`  ${'start'.padStart(6)} ${'dur'.padStart(6)} ${'kB'.padStart(6)} ${'block'.padEnd(12)} url`);
    for (const r of sorted) {
      const url = r.name.slice(0, 65);
      console.log(`  ${String(r.start).padStart(6)} ${String(r.dur).padStart(6)} ${(r.bytes/1024).toFixed(1).padStart(6)} ${(r.blocking||'?').padEnd(12)} ${url}`);
    }

    return { label, url, data, consoleMsgs, networkRequests };

  } finally {
    await ctx.close();
  }
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const seekerState   = resolve(ROOT, 'tests/.auth/seeker.json');
  const employerState = resolve(ROOT, 'tests/.auth/employer.json');

  // Quick check that auth files have real cookies
  for (const [name, path] of [['seeker', seekerState], ['employer', employerState]]) {
    const s = JSON.parse(readFileSync(path, 'utf8'));
    if (!s.cookies?.length) {
      console.error(`ERROR: ${name} auth file has no cookies. Run: npx playwright test --project=${name}-setup`);
      process.exit(1);
    }
  }

  console.log('auth-page-investigate.mjs');
  console.log(`Target: ${BASE_URL}`);

  const browser = await chromium.launch({ headless: true });
  const results = [];

  try {
    // Run each page twice: cold then warm (same context reuse)
    for (const [label, url, auth] of [
      ['profile-edit',        `${BASE_URL}/profile/edit`,        seekerState],
      ['employer-dashboard',  `${BASE_URL}/employer/dashboard`,  employerState],
    ]) {
      // Cold run
      const cold = await investigate(browser, `${label}-cold`, url, auth);
      results.push(cold);

      // Warm run: create a fresh context with the same auth, pre-warm, then measure
      console.log(`\n── ${label} (warm) ──`);
      const ctx2 = await browser.newContext({ ignoreHTTPSErrors: true, storageState: auth });
      const pg2  = await ctx2.newPage();
      await pg2.addInitScript(OBSERVER_SCRIPT);
      const cdp2 = await ctx2.newCDPSession(pg2);
      await cdp2.send('Network.enable');
      const consoleMsgs2 = [];
      pg2.on('console', msg => consoleMsgs2.push({ type: msg.type(), text: msg.text().slice(0,300) }));

      // Pre-warm (same context = browser cache retained)
      await pg2.goto(url, { waitUntil: 'load', timeout: 60_000 });
      await pg2.waitForTimeout(500);

      // Reset observers before measured run
      await pg2.evaluate(() => {
        window.__inv = { lcp:0, lcpEl:null, cls:0, clsEntries:[], tbt:0, longTasks:[], fp:0, fcp:0, hydrationWarnings:[], reactErrors:[] };
      });
      await pg2.addInitScript(OBSERVER_SCRIPT);

      // Measured run
      await pg2.goto(url, { waitUntil: 'load', timeout: 60_000 });
      await pg2.waitForTimeout(3000);

      const warmData = await pg2.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0];
        if (!nav) return null;
        return {
          ttfb: Math.round(nav.responseStart),
          fp: Math.round(window.__inv?.fp || 0),
          lcp: Math.round(window.__inv?.lcp || 0),
          cls: +(( window.__inv?.cls || 0).toFixed(4)),
          tbt: Math.round(window.__inv?.tbt || 0),
          domInteractive: Math.round(nav.domInteractive),
          domComplete: Math.round(nav.domComplete),
          loadEvent: Math.round(nav.loadEventEnd),
          transferSize: nav.transferSize,
          lcpEl: window.__inv?.lcpEl,
          clsEntries: window.__inv?.clsEntries || [],
          hydrationWarnings: window.__inv?.hydrationWarnings || [],
          longTasks: window.__inv?.longTasks || [],
        };
      });

      if (warmData) {
        console.log(`  TTFB: ${fmtMs(warmData.ttfb)}  FP: ${fmtMs(warmData.fp)}  LCP: ${fmtMs(warmData.lcp)}  CLS: ${fmtCls(warmData.cls)}  TBT: ${fmtMs(warmData.tbt)}`);
        console.log(`  domInteractive: ${fmtMs(warmData.domInteractive)}  domComplete: ${fmtMs(warmData.domComplete)}`);
        if (warmData.lcpEl) console.log(`  LCP element: <${warmData.lcpEl.tag}> "${warmData.lcpEl.text}"`);
        if (warmData.hydrationWarnings?.length) {
          console.log(`  ⚠ Hydration warnings: ${warmData.hydrationWarnings.length}`);
          for (const w of warmData.hydrationWarnings) console.log(`    ${w}`);
        } else {
          console.log(`  ✓ No hydration warnings`);
        }
        if (warmData.clsEntries?.length) {
          console.log(`  CLS entries:`);
          for (const e of warmData.clsEntries) {
            console.log(`    t=${Math.round(e.time)}ms  value=${e.value.toFixed(4)}`);
            for (const s of (e.sources||[])) {
              console.log(`      <${s.tag}> "${s.text.slice(0,50)}" prev=${s.previous} → curr=${s.current}`);
            }
          }
        }
        if (warmData.longTasks?.filter(t => t.dur > 50).length) {
          for (const t of warmData.longTasks.filter(t => t.dur > 50)) {
            console.log(`  Long task: t=${t.start}ms  dur=${t.dur}ms`);
          }
        }
      }
      await ctx2.close();
    }

  } finally {
    await browser.close();
  }

  console.log('\n\nDone. See screenshots in perf-results/.');
}

main().catch(err => { console.error(err); process.exit(1); });
