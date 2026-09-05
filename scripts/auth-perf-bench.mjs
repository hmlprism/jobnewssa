#!/usr/bin/env node
/**
 * auth-perf-bench.mjs — multi-run benchmark for authenticated pages
 *
 * Tests /employer/dashboard and /profile/edit with real auth cookies.
 * 4 conditions × 5 cold runs = 20 loads per page.
 * Prints TTFB / LCP / CLS / TBT tables.
 *
 * Usage:  node scripts/auth-perf-bench.mjs
 * Output: perf-results/auth-bench-<timestamp>.json
 */

import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT     = resolve(__dirname, '..');
const OUT_DIR  = resolve(ROOT, 'perf-results');
const BASE_URL = 'https://jobnewssa.vercel.app';
const RUNS     = 5;
const PAUSE_MS = 1500;

const CONDITIONS = [
  { id: 'fast-connection', label: 'Fast connection', network: null, cpuRate: 1 },
  {
    id: 'fast-3g',
    label: 'Fast 3G',
    network: {
      offline: false,
      latency: 562.5,
      downloadThroughput: Math.floor(1.44 * 1024 * 1024 / 8),
      uploadThroughput:   Math.floor(0.75 * 1024 * 1024 / 8),
    },
    cpuRate: 1,
  },
  {
    id: 'slow-4g',
    label: 'Slow 4G',
    network: {
      offline: false,
      latency: 170,
      downloadThroughput: Math.floor(9 * 1024 * 1024 / 8),
      uploadThroughput:   Math.floor(4.75 * 1024 * 1024 / 8),
    },
    cpuRate: 1,
  },
  { id: '4x-cpu', label: '4× CPU', network: null, cpuRate: 4 },
];

const OBSERVER_SCRIPT = `
(function () {
  window.__vitals = { lcp: 0, cls: 0, tbt: 0 };
  try {
    new PerformanceObserver(list => {
      for (const e of list.getEntries()) window.__vitals.lcp = e.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (_) {}
  try {
    new PerformanceObserver(list => {
      for (const e of list.getEntries()) {
        if (!e.hadRecentInput) window.__vitals.cls += e.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch (_) {}
  try {
    new PerformanceObserver(list => {
      for (const e of list.getEntries()) {
        if (e.duration > 50) window.__vitals.tbt += (e.duration - 50);
      }
    }).observe({ type: 'longtask', buffered: true });
  } catch (_) {}
})();
`;

const sleep = ms => new Promise(r => setTimeout(r, ms));

function median(arr) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s.length % 2 ? s[Math.floor(s.length / 2)] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
}

function stats(runs, field) {
  const vals = runs
    .filter(r => !r.failed)
    .map(r => r[field])
    .filter(v => typeof v === 'number' && isFinite(v) && v >= 0);
  return {
    median: median(vals),
    worst:  vals.length ? Math.max(...vals) : null,
    n:      vals.length,
  };
}

async function measure(browser, url, condition, storageState) {
  const ctx  = await browser.newContext({ ignoreHTTPSErrors: true, storageState });
  const page = await ctx.newPage();
  await page.addInitScript(OBSERVER_SCRIPT);

  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');

  if (condition.network) {
    await cdp.send('Network.emulateNetworkConditions', {
      ...condition.network,
      connectionType: 'none',
    });
  }
  if (condition.cpuRate > 1) {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: condition.cpuRate });
  }

  try {
    await page.goto(url, { waitUntil: 'load', timeout: 90_000 });
    await page.waitForTimeout(1_500);

    const data = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      if (!nav) return null;
      const v = window.__vitals || {};
      return {
        ttfb: Math.round(nav.responseStart),
        lcp:  Math.round(v.lcp || 0),
        cls:  +((v.cls || 0).toFixed(4)),
        tbt:  Math.round(v.tbt || 0),
      };
    });

    if (!data) return { failed: true, error: 'Navigation timing API unavailable' };
    return data;
  } catch (err) {
    return { failed: true, error: err.message };
  } finally {
    await ctx.close();
  }
}

function pad(s, w) { return String(s).padStart(w); }

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const seekerState   = resolve(ROOT, 'tests/.auth/seeker.json');
  const employerState = resolve(ROOT, 'tests/.auth/employer.json');

  const PAGES = [
    { id: 'employer-dashboard', label: 'Employer dashboard (/employer/dashboard)', path: '/employer/dashboard', auth: employerState },
    { id: 'profile-edit',       label: 'Profile edit (/profile/edit)',             path: '/profile/edit',       auth: seekerState   },
  ];

  // Validate auth files
  for (const pg of PAGES) {
    try {
      const s = JSON.parse(readFileSync(pg.auth, 'utf8'));
      if (!s.cookies?.length) {
        console.error(`ERROR: auth file has no cookies: ${pg.auth}`);
        console.error(`Run: npx playwright test --project=${pg.id.includes('employer') ? 'employer' : 'seeker'}-setup`);
        process.exit(1);
      }
    } catch (err) {
      console.error(`ERROR reading auth file ${pg.auth}: ${err.message}`);
      process.exit(1);
    }
  }

  const ts      = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outFile = resolve(OUT_DIR, `auth-bench-${ts}.json`);
  const results = {};

  console.log(`\nauth-perf-bench — ${RUNS} cold runs × 4 conditions × ${PAGES.length} pages`);
  console.log(`Target: ${BASE_URL}\n`);

  console.log('Waiting 20 s for Vercel deploy to propagate...');
  await sleep(20_000);

  const browser = await chromium.launch({ headless: true });

  for (const pg of PAGES) {
    results[pg.id] = {};
    for (const cond of CONDITIONS) {
      const url  = `${BASE_URL}${pg.path}`;
      const runs = [];
      console.log(`\n[${cond.id}] ${pg.label}`);
      for (let i = 0; i < RUNS; i++) {
        process.stdout.write(`  run ${i + 1}/${RUNS} ... `);
        const r = await measure(browser, url, cond, pg.auth);
        if (r.failed) {
          console.log(`FAILED: ${r.error}`);
        } else {
          console.log(`TTFB=${r.ttfb}ms  LCP=${r.lcp}ms  CLS=${r.cls}  TBT=${r.tbt}ms`);
        }
        runs.push(r);
        if (i < RUNS - 1) await sleep(PAUSE_MS);
      }
      results[pg.id][cond.id] = runs;
    }
  }

  await browser.close();
  writeFileSync(outFile, JSON.stringify({ pages: PAGES, runs: RUNS, timestamp: ts, results }, null, 2));
  console.log(`\nRaw results saved to ${outFile}\n`);

  // ── Summary tables ───────────────────────────────────────────────────────
  for (const pg of PAGES) {
    console.log(`\n## ${pg.label}\n`);
    console.log('Condition          | TTFB (med/worst) | LCP (med/worst)  | CLS   | TBT (med/worst)');
    console.log('-------------------|------------------|------------------|-------|----------------');
    for (const cond of CONDITIONS) {
      const runs = results[pg.id][cond.id] || [];
      const st = stats(runs, 'ttfb');
      const sl = stats(runs, 'lcp');
      const sc = stats(runs, 'cls');
      const sb = stats(runs, 'tbt');

      const ttfb = st.median != null ? `${pad(Math.round(st.median),4)} / ${pad(Math.round(st.worst),4)} ms` : '  N/A';
      const lcp  = sl.median != null ? `${pad(Math.round(sl.median),4)} / ${pad(Math.round(sl.worst),4)} ms` : '  N/A';
      const cls  = sc.median != null ? sc.median.toFixed(3) : 'N/A';
      const tbt  = sb.median != null ? `${pad(Math.round(sb.median),3)} / ${pad(Math.round(sb.worst),3)} ms` : '  N/A';

      console.log(`${cond.label.padEnd(19)}| ${ttfb.padEnd(16)} | ${lcp.padEnd(16)} | ${cls.padEnd(5)} | ${tbt}`);
    }
  }

  console.log('\nDone.');
}

main().catch(err => { console.error(err); process.exit(1); });
