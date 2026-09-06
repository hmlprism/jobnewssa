#!/usr/bin/env node
/**
 * perf-compare.mjs — focused before/after benchmark for a single fix
 *
 * Tests /jobs only, 4 conditions × 5 cold runs = 20 loads.
 * Prints a compact table with TTFB / LCP / CLS / TBT for each condition.
 *
 * Usage:  node scripts/perf-compare.mjs
 * Output: perf-results/compare-<timestamp>.json
 */

import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT     = resolve(__dirname, '..');
const OUT_DIR  = resolve(ROOT, 'perf-results');
const BASE_URL = 'https://jobnewssa.vercel.app';
const RUNS     = 5;
const PAUSE_MS = 1200;

const CONDITIONS = [
  {
    id: 'fast-connection',
    label: 'Fast connection',
    network: null,
    cpuRate: 1,
  },
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
  {
    id: '4x-cpu',
    label: '4× CPU',
    network: null,
    cpuRate: 4,
  },
];

const OBSERVER_SCRIPT = `
(function () {
  window.__vitals = { lcp: 0, cls: 0, tbt: 0 };
  try {
    const po = new PerformanceObserver(list => {
      for (const e of list.getEntries()) window.__vitals.lcp = e.startTime;
    });
    po.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (_) {}
  try {
    const po = new PerformanceObserver(list => {
      for (const e of list.getEntries()) {
        if (!e.hadRecentInput) window.__vitals.cls += e.value;
      }
    });
    po.observe({ type: 'layout-shift', buffered: true });
  } catch (_) {}
  try {
    const po = new PerformanceObserver(list => {
      for (const e of list.getEntries()) {
        if (e.duration > 50) window.__vitals.tbt += (e.duration - 50);
      }
    });
    po.observe({ type: 'longtask', buffered: true });
  } catch (_) {}
})();
`;

const PAGES = [
  { id: 'home',      label: 'Homepage (/)',   path: '/' },
  { id: 'jobs',      label: 'Jobs (/jobs)',   path: '/jobs' },
  { id: 'job-detail',label: 'Job detail',     path: null }, // filled at runtime
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

function median(arr) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s.length % 2
    ? s[Math.floor(s.length / 2)]
    : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
}

function stats(runs, field) {
  const vals = runs
    .filter(r => !r.failed)
    .map(r => r[field])
    .filter(v => typeof v === 'number' && isFinite(v) && v >= 0);
  return {
    median: median(vals),
    worst:  vals.length ? Math.max(...vals) : null,
    best:   vals.length ? Math.min(...vals) : null,
    n:      vals.length,
  };
}

async function measure(browser, url, condition) {
  const ctx  = await browser.newContext({ ignoreHTTPSErrors: true });
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
      const paints = {};
      for (const p of performance.getEntriesByType('paint')) paints[p.name] = p.startTime;
      const v = window.__vitals || {};
      return {
        ttfb: Math.round(nav.responseStart),
        fp:   Math.round(paints['first-paint'] || 0),
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

function fmtMs(n)  { return n == null ? ' N/A' : `${Math.round(n)} ms`; }
function fmtCls(n) { return n == null ? ' N/A' : n.toFixed(3); }

function pad(s, w) { return String(s).padStart(w); }

async function discoverSlug(browser) {
  const ctx  = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  try {
    await page.goto(`${BASE_URL}/jobs`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    const href = await page.evaluate(() => {
      const a = document.querySelector('a[href^="/jobs/"]');
      return a ? a.getAttribute('href') : null;
    });
    if (!href) throw new Error('No /jobs/[slug] link found');
    return href.replace('/jobs/', '').split('?')[0];
  } finally {
    await ctx.close();
  }
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const ts      = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outFile = resolve(OUT_DIR, `compare-${ts}.json`);
  const results = {};

  console.log(`\nperf-compare — homepage + /jobs + job-detail — ${RUNS} cold runs × 4 conditions`);
  console.log(`Target: ${BASE_URL}\n`);

  console.log('Waiting 20 s for Vercel deploy to propagate...');
  await sleep(20_000);

  const browser = await chromium.launch({ headless: true });

  // Fill job-detail path
  process.stdout.write('Discovering job slug ... ');
  const slug = await discoverSlug(browser);
  console.log(`"${slug}"`);
  PAGES.find(p => p.id === 'job-detail').path = `/jobs/${slug}`;

  for (const cond of CONDITIONS) {
    results[cond.id] = {};
    for (const pg of PAGES) {
      const url = `${BASE_URL}${pg.path}`;
      console.log(`\n[${cond.id}] ${pg.label}`);
      const runs = [];
      for (let i = 0; i < RUNS; i++) {
        process.stdout.write(`  run ${i + 1}/${RUNS} ... `);
        const r = await measure(browser, url, cond);
        if (r.failed) {
          console.log(`FAILED: ${r.error}`);
        } else {
          console.log(`TTFB=${r.ttfb}ms  LCP=${r.lcp}ms  CLS=${r.cls}  TBT=${r.tbt}ms`);
        }
        runs.push(r);
        if (i < RUNS - 1) await sleep(PAUSE_MS);
      }
      results[cond.id][pg.id] = runs;
    }
  }

  await browser.close();
  writeFileSync(outFile, JSON.stringify({ pages: PAGES, runs: RUNS, timestamp: ts, results }, null, 2));
  console.log(`\nRaw results saved to ${outFile}\n`);

  // ── Print summary tables per page ─────────────────────────────────────────
  for (const pg of PAGES) {
    console.log(`\n## ${pg.label}\n`);
    console.log('Condition          | TTFB (med/worst) | LCP (med/worst)  | CLS   | TBT (med/worst)');
    console.log('-------------------|------------------|------------------|-------|----------------');

    for (const cond of CONDITIONS) {
      const runs = results[cond.id][pg.id] || [];
      const s = f => stats(runs, f);
      const st = s('ttfb'), sl = s('lcp'), sc = s('cls'), sb = s('tbt');

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
