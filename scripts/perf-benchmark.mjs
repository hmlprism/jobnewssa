#!/usr/bin/env node
/**
 * perf-benchmark.mjs — Playwright + CDP performance benchmark
 * Target: https://jobnewssa.vercel.app
 *
 * Step 1  Measures TTFB (with breakdown), FP, FCP, LCP, CLS, TBT,
 *         total bytes transferred, and request count.
 *         4 conditions × 2 cache states × 5 runs × 5 pages = 200 measured loads.
 *
 * Step 2  Captures resource waterfall (resource timing + render-blocking analysis)
 *         for every page under Fast 3G cold, which is typically the worst condition.
 *
 * Step 3  Records the actual Cache-Control / Vary / ETag headers returned by
 *         every resource, once per page under the fast-connection cold run.
 *
 * Usage:  node scripts/perf-benchmark.mjs
 * Output: perf-results/results.json
 *         perf-results/report.md
 *         perf-results/waterfall-fast-3g-<page>.md
 */

import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT     = resolve(__dirname, '..');
const OUT_DIR  = resolve(ROOT, 'perf-results');
const BASE_URL = 'https://jobnewssa.vercel.app';
const RUNS     = 5;
const PAUSE_MS = 1200; // polite inter-run pause against production

// ── Network / CPU conditions ──────────────────────────────────────────────────

const CONDITIONS = [
  {
    id: 'fast-connection',
    label: 'Fast connection (no throttle)',
    network: null,
    cpuRate: 1,
    nominalRttMs: null,  // unknown — depends on actual network to Vercel
  },
  {
    id: 'fast-3g',
    label: 'Fast 3G',
    // Chrome DevTools preset: 562.5 ms latency = RTT, 1.44 Mbps down, 0.75 Mbps up
    network: {
      offline: false,
      latency: 562.5,
      downloadThroughput: Math.floor(1.44 * 1024 * 1024 / 8),
      uploadThroughput:   Math.floor(0.75 * 1024 * 1024 / 8),
    },
    cpuRate: 1,
    nominalRttMs: 562.5,
  },
  {
    id: 'slow-4g',
    label: 'Slow 4G',
    // Chrome DevTools "Regular 4G" preset: 170 ms RTT, 9 Mbps down, 4.75 Mbps up
    network: {
      offline: false,
      latency: 170,
      downloadThroughput: Math.floor(9 * 1024 * 1024 / 8),
      uploadThroughput:   Math.floor(4.75 * 1024 * 1024 / 8),
    },
    cpuRate: 1,
    nominalRttMs: 170,
  },
  {
    id: '4x-cpu',
    label: '4× CPU throttle (no network throttle)',
    network: null,
    cpuRate: 4,
    nominalRttMs: null,
  },
];

// ── Observer script — injected before every navigation ────────────────────────
// Resets on each navigation because the window object is recreated.

const OBSERVER_SCRIPT = `
(function () {
  window.__vitals = { lcp: 0, cls: 0, tbt: 0, longTasks: [] };

  // LCP — largest-contentful-paint
  try {
    const po = new PerformanceObserver(list => {
      for (const e of list.getEntries()) {
        window.__vitals.lcp = e.startTime;
      }
    });
    po.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (_) {}

  // CLS — cumulative layout shift (ignore shifts with recent user input)
  try {
    const po = new PerformanceObserver(list => {
      for (const e of list.getEntries()) {
        if (!e.hadRecentInput) window.__vitals.cls += e.value;
      }
    });
    po.observe({ type: 'layout-shift', buffered: true });
  } catch (_) {}

  // TBT — sum of blocking portions of Long Tasks (each task > 50 ms)
  try {
    const po = new PerformanceObserver(list => {
      for (const e of list.getEntries()) {
        window.__vitals.longTasks.push({
          start: Math.round(e.startTime),
          duration: Math.round(e.duration),
        });
        if (e.duration > 50) window.__vitals.tbt += (e.duration - 50);
      }
    });
    po.observe({ type: 'longtask', buffered: true });
  } catch (_) {}
})();
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

const sleep = ms => new Promise(r => setTimeout(r, ms));

function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s.length % 2
    ? s[Math.floor(s.length / 2)]
    : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
}

function statsOf(runs, field) {
  const vals = runs
    .filter(r => !r.failed)
    .map(r => r[field])
    .filter(v => typeof v === 'number' && isFinite(v) && v >= 0);
  if (!vals.length) return { median: null, worst: null, best: null };
  return {
    median: median(vals),
    worst:  Math.max(...vals),
    best:   Math.min(...vals),
  };
}

function fmtMs(n)  { return n == null ? 'N/A' : `${Math.round(n)} ms`; }
function fmtKb(n)  { return n == null ? 'N/A' : `${(n / 1024).toFixed(0)} kB`; }
function fmtCls(n) { return n == null ? 'N/A' : n.toFixed(3); }
function fmtN(n)   { return n == null ? 'N/A' : String(Math.round(n)); }

// ── Slug discovery ────────────────────────────────────────────────────────────

async function discoverSlug(browser) {
  process.stdout.write('Discovering job slug from /jobs ... ');
  const ctx  = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  try {
    await page.goto(`${BASE_URL}/jobs`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    const href = await page.evaluate(() => {
      const a = document.querySelector('a[href^="/jobs/"]');
      return a ? a.getAttribute('href') : null;
    });
    if (!href) throw new Error('No /jobs/[slug] link found on /jobs listing');
    const slug = href.replace('/jobs/', '').split('?')[0].split('#')[0];
    console.log(`OK  slug="${slug}"`);
    return slug;
  } finally {
    await ctx.close();
  }
}

// ── Core measurement function ─────────────────────────────────────────────────

async function measure(browser, url, condition, storageStatePath, warm) {
  const ctxOpts = { ignoreHTTPSErrors: true };
  if (storageStatePath) ctxOpts.storageState = storageStatePath;

  const ctx  = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();

  // Inject Web Vitals observers — runs on every navigation of this page
  await page.addInitScript(OBSERVER_SCRIPT);

  // CDP session — used for throttle + response header capture
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');

  // Apply network throttle
  if (condition.network) {
    await cdp.send('Network.emulateNetworkConditions', {
      ...condition.network,
      connectionType: 'none',
    });
  }

  // Apply CPU throttle
  if (condition.cpuRate > 1) {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: condition.cpuRate });
  }

  // Accumulate response headers from CDP
  const responseHeaders = new Map();
  cdp.on('Network.responseReceived', ({ requestId, response }) => {
    responseHeaders.set(requestId, {
      url:             response.url,
      status:          response.status,
      mimeType:        response.mimeType || '',
      cacheControl:    response.headers['cache-control']
                    || response.headers['Cache-Control'] || '(none)',
      vary:            response.headers['vary'] || response.headers['Vary'] || '',
      etag:            !!(response.headers['etag'] || response.headers['ETag']),
      age:             response.headers['age'] || response.headers['Age'] || '',
      xVercelCache:    response.headers['x-vercel-cache'] || '',
      fromDiskCache:   response.fromDiskCache   || false,
      fromMemoryCache: response.fromMemoryCache || false,
    });
  });

  try {
    // ── Warm pre-load (same context so browser cache carries over) ────────────
    if (warm) {
      await page.goto(url, { waitUntil: 'load', timeout: 90_000 }).catch(() => {});
      await page.waitForTimeout(500);
      // Clear header accumulator so only the measured navigation's headers appear
      responseHeaders.clear();
    }

    // ── Actual measured navigation ─────────────────────────────────────────
    const navStart = Date.now();
    await page.goto(url, { waitUntil: 'load', timeout: 90_000 });
    // Let LCP, CLS, and Long Tasks settle
    await page.waitForTimeout(1_500);

    const finalUrl = page.url();
    const wasRedirected = !finalUrl.startsWith(url.split('?')[0]);

    // ── Collect timing from browser APIs ──────────────────────────────────
    const data = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      if (!nav) return null;

      const paints = {};
      for (const p of performance.getEntriesByType('paint')) paints[p.name] = p.startTime;

      // Resource Timing — everything sub-resource
      const resources = performance.getEntriesByType('resource').map(r => ({
        name:           r.name,
        initiatorType:  r.initiatorType,
        startTime:      Math.round(r.startTime),
        duration:       Math.round(r.duration),
        transferSize:   r.transferSize    || 0,
        encodedBodySize:r.encodedBodySize || 0,
        decodedBodySize:r.decodedBodySize || 0,
        // renderBlockingStatus is Chrome 107+; may be undefined in older Chrome
        renderBlocking: r.renderBlockingStatus || 'unknown',
      }));

      const v = window.__vitals || {};

      return {
        // ─ TTFB decomposition (all times ms relative to navigation start) ─
        ttfb:       Math.round(nav.responseStart),
        dns:        Math.round(nav.domainLookupEnd  - nav.domainLookupStart),
        tcp:        Math.round(nav.connectEnd        - nav.connectStart),
        tls:        nav.secureConnectionStart > 0
                      ? Math.round(nav.connectEnd - nav.secureConnectionStart)
                      : 0,
        // requestStart → responseStart: time after sending the HTTP request
        // until the first byte arrived.  Includes server processing + one-way
        // return-path network latency.  Cannot be split further from the browser.
        serverWait: Math.round(nav.responseStart - nav.requestStart),

        // ─ Paint / interaction milestones ─────────────────────────────────
        fp:  Math.round(paints['first-paint']             || 0),
        fcp: Math.round(paints['first-contentful-paint']  || 0),
        lcp: Math.round(v.lcp || 0),
        cls: +(( v.cls || 0).toFixed(4)),
        tbt: Math.round(v.tbt || 0),
        longTasks: v.longTasks || [],

        // ─ Load milestones ────────────────────────────────────────────────
        domInteractive: Math.round(nav.domInteractive),
        domComplete:    Math.round(nav.domComplete),
        loadEventEnd:   Math.round(nav.loadEventEnd),

        // ─ Transfer (document only) ───────────────────────────────────────
        docTransferSize:    nav.transferSize    || 0,
        docEncodedBodySize: nav.encodedBodySize || 0,

        resources,
      };
    });

    if (!data) return { failed: true, error: 'Navigation timing API unavailable', url, finalUrl };

    // Aggregate resource bytes (document + sub-resources)
    const resourceBytes = data.resources.reduce((s, r) => s + r.transferSize, 0);
    data.totalBytes    = data.docTransferSize + resourceBytes;
    data.requestCount  = 1 + data.resources.length;
    data.url           = url;
    data.finalUrl      = finalUrl;
    data.wasRedirected = wasRedirected;

    // Snapshot response headers (first ~30 resources)
    data.cacheHeaders = [...responseHeaders.values()]
      .slice(0, 30)
      .map(h => ({
        ...h,
        url: h.url.replace(BASE_URL, '') || h.url,
      }));

    return data;

  } catch (err) {
    return { failed: true, error: err.message, url };
  } finally {
    await ctx.close();
  }
}

// ── Report builders ───────────────────────────────────────────────────────────

function tableRow(cells) {
  return `| ${cells.join(' | ')} |`;
}

function buildReport({ pages, conditions, data }, jobSlug) {
  const lines = [];
  const ts = new Date().toISOString();

  lines.push('# Performance Benchmark — Job News SA');
  lines.push('');
  lines.push(`**Run:** ${ts}`);
  lines.push(`**Target:** ${BASE_URL}`);
  lines.push(`**Job slug under test:** \`${jobSlug}\``);
  lines.push(`**Runs per cell:** ${RUNS} cold + ${RUNS} warm`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // ── 1. Summary table: median | worst — cold ───────────────────────────────
  lines.push('## 1. Summary — cold cache (median / worst)');
  lines.push('');
  lines.push('All times in ms. Bytes = total transferred (HTML + sub-resources).');
  lines.push('TTFB = `responseStart` from Navigation Timing Level 2 (relative to navigation start).');
  lines.push('');

  for (const cond of conditions) {
    lines.push(`### ${cond.label}`);
    lines.push('');
    const cols = ['Page', 'TTFB', 'FP', 'LCP', 'CLS', 'TBT', 'Bytes', 'Requests'];
    lines.push(tableRow(cols));
    lines.push(tableRow(cols.map(() => '---')));

    for (const pg of pages) {
      const runs = (data[cond.id]?.[pg.id]?.cold || []).filter(r => !r.failed);
      if (!runs.length) {
        lines.push(tableRow([pg.label, ...cols.slice(1).map(() => 'N/A')]));
        continue;
      }
      const s = field => statsOf(runs, field);

      const cell = (st, fmt) =>
        st.median == null ? 'N/A' : `${fmt(st.median)} / ${fmt(st.worst)}`;

      lines.push(tableRow([
        pg.label,
        cell(s('ttfb'),       fmtMs),
        cell(s('fp'),         fmtMs),
        cell(s('lcp'),        fmtMs),
        cell(s('cls'),        fmtCls),
        cell(s('tbt'),        fmtMs),
        cell(s('totalBytes'), fmtKb),
        cell(s('requestCount'), fmtN),
      ]));
    }
    lines.push('');
  }

  // ── 2. Cold vs Warm — fast connection ─────────────────────────────────────
  lines.push('## 2. Cold vs Warm cache — fast connection');
  lines.push('');
  lines.push('"Warm" = same browser context, page loaded once to populate in-memory cache,');
  lines.push('then measured. Simulates a returning visitor within the same browsing session.');
  lines.push('HTML document is still fetched fresh (SSR pages do not set `max-age` on the document).');
  lines.push('');

  const hdr2 = ['Page', 'Cold TTFB', 'Warm TTFB', 'Cold LCP', 'Warm LCP', 'Cold Bytes', 'Warm Bytes'];
  lines.push(tableRow(hdr2));
  lines.push(tableRow(hdr2.map(() => '---')));

  for (const pg of pages) {
    const coldRuns = (data['fast-connection']?.[pg.id]?.cold || []).filter(r => !r.failed);
    const warmRuns = (data['fast-connection']?.[pg.id]?.warm || []).filter(r => !r.failed);
    const ms = (runs, f) => {
      const st = statsOf(runs, f);
      return st.median == null ? 'N/A' : fmtMs(st.median);
    };
    const kb = (runs, f) => {
      const st = statsOf(runs, f);
      return st.median == null ? 'N/A' : fmtKb(st.median);
    };
    lines.push(tableRow([
      pg.label,
      ms(coldRuns, 'ttfb'),  ms(warmRuns, 'ttfb'),
      ms(coldRuns, 'lcp'),   ms(warmRuns, 'lcp'),
      kb(coldRuns, 'totalBytes'), kb(warmRuns, 'totalBytes'),
    ]));
  }
  lines.push('');

  // ── 3. TTFB decomposition ─────────────────────────────────────────────────
  lines.push('## 3. TTFB breakdown — cold cache, median ms');
  lines.push('');
  lines.push('**Columns:**');
  lines.push('- **DNS** — domain lookup time (0 = cached in OS resolver)');
  lines.push('- **TCP+TLS** — connection setup (0 = connection reused)');
  lines.push('- **Server+network wait** = `responseStart − requestStart`.');
  lines.push('  Includes server processing time + one-way return-path network latency.');
  lines.push('  These two cannot be separated from browser-side data alone.');
  lines.push('- **Est. server only** (throttled conditions) ≈ server+network wait − RTT÷2.');
  lines.push('  For fast-connection the RTT is unknown; that column is omitted.');
  lines.push('- **TTFB total** = `responseStart` from nav start');
  lines.push('');

  const hdr3 = ['Page', 'Condition', 'DNS', 'TCP+TLS', 'Server+net wait', 'Est. server only', 'TTFB total'];
  lines.push(tableRow(hdr3));
  lines.push(tableRow(hdr3.map(() => '---')));

  for (const pg of pages) {
    for (const cond of conditions) {
      const runs = (data[cond.id]?.[pg.id]?.cold || []).filter(r => !r.failed);
      if (!runs.length) continue;
      const med = f => statsOf(runs, f).median;

      const serverNetWait = med('serverWait');
      const estServerOnly = cond.nominalRttMs != null && serverNetWait != null
        ? Math.max(0, serverNetWait - cond.nominalRttMs / 2)
        : null;

      lines.push(tableRow([
        pg.label,
        cond.label,
        fmtMs(med('dns')),
        fmtMs(med('tcp')),
        fmtMs(serverNetWait),
        estServerOnly != null ? `~${fmtMs(estServerOnly)}` : '(need RTT)',
        fmtMs(med('ttfb')),
      ]));
    }
  }
  lines.push('');

  // ── 4. Ranked costs (Fast 3G cold) ────────────────────────────────────────
  lines.push('## 4. Ranked costs — Fast 3G, cold cache');
  lines.push('');
  lines.push('Sorted by LCP descending. This is the worst condition for real users on mobile.');
  lines.push('');

  const rankRows = [];
  for (const pg of pages) {
    const runs = (data['fast-3g']?.[pg.id]?.cold || []).filter(r => !r.failed);
    if (!runs.length) continue;
    const med = f => statsOf(runs, f).median ?? 0;
    rankRows.push({
      label:    pg.label,
      lcp:      med('lcp'),
      ttfb:     med('ttfb'),
      tbt:      med('tbt'),
      bytes:    med('totalBytes'),
      requests: med('requestCount'),
    });
  }
  rankRows.sort((a, b) => b.lcp - a.lcp);

  const hdr4 = ['Rank', 'Page', 'LCP (med)', 'TTFB (med)', 'TBT (med)', 'Bytes (med)', 'Requests'];
  lines.push(tableRow(hdr4));
  lines.push(tableRow(hdr4.map(() => '---')));
  rankRows.forEach((r, i) => {
    lines.push(tableRow([
      String(i + 1),
      r.label,
      fmtMs(r.lcp),
      fmtMs(r.ttfb),
      fmtMs(r.tbt),
      fmtKb(r.bytes),
      fmtN(r.requests),
    ]));
  });
  lines.push('');

  // ── 5. Cache headers ──────────────────────────────────────────────────────
  lines.push('## 5. Cache headers — fast connection, cold, first run');
  lines.push('');
  lines.push('`x-vercel-cache`: HIT = served from Vercel edge; MISS/BYPASS = origin response.');
  lines.push('');

  for (const pg of pages) {
    const runs = (data['fast-connection']?.[pg.id]?.cold || []).filter(r => !r.failed && r.cacheHeaders?.length);
    if (!runs.length) continue;

    const hdrs = runs[0].cacheHeaders;
    lines.push(`### ${pg.label}`);
    lines.push('');
    lines.push('| Resource | Status | Cache-Control | x-vercel-cache | From browser cache? |');
    lines.push('| --- | --- | --- | --- | --- |');

    for (const h of hdrs.slice(0, 25)) {
      const shortUrl = h.url.length > 65 ? '…' + h.url.slice(-62) : h.url;
      const fromCache = h.fromDiskCache   ? 'disk'
                      : h.fromMemoryCache ? 'memory'
                      : '—';
      lines.push(`| \`${shortUrl}\` | ${h.status} | \`${h.cacheControl}\` | \`${h.xVercelCache || '—'}\` | ${fromCache} |`);
    }
    lines.push('');
  }

  // ── 6. Fixable vs infrastructure ──────────────────────────────────────────
  lines.push('## 6. Fixable now vs requires infrastructure changes');
  lines.push('');
  lines.push('| Cost | Fixable now? | Notes |');
  lines.push('| --- | --- | --- |');
  lines.push('| Supabase DB round-trip in TTFB | **No** | Part of `server+network wait`. Requires Vercel KV/Redis or true ISR to cache the DB result at the edge. The `unstable_cache` improvement reduces DB hit rate per container but cannot eliminate SSR wait. |');
  lines.push('| Per-request SSR (no ISR/CDN edge cache) | **No (short term)** | All pages are `force-dynamic`. Edge-caching the rendered HTML requires ISR or stale-while-revalidate headers — a separate architectural decision. |');
  lines.push('| Google Fonts / self-hosted fonts | **Investigate** | `next/font` self-hosts; check if font files are render-blocking or just swap. See waterfall. |');
  lines.push('| JavaScript bundle size | **Investigate** | `lucide-react` and `date-fns` may add treeshaking cost. Run `ANALYZE=true npm run build` after installing `@next/bundle-analyzer`. |');
  lines.push('| Images oversized / wrong format | **Investigate** | No `<Image>` components visible in source — check if any images are present and whether `next/image` is used. |');
  lines.push('| TBT / long tasks | **Investigate** | If TBT > 100 ms, audit which scripts cause long tasks (see waterfall + longTasks list in results.json). |');
  lines.push('| Render-blocking CSS | **Investigate** | Tailwind v4 emits a single CSS file. Check `renderBlocking` column in waterfall. |');
  lines.push('| Redirects adding RTTs | **Investigate** | `/profile/edit` and `/employer/dashboard` redirect unauthenticated users — each redirect = 1 extra RTT. |');
  lines.push('');

  return lines.join('\n');
}

function buildWaterfall(run, label) {
  const lines = [];

  lines.push(`## Waterfall — ${label}`);
  lines.push('');
  lines.push(`TTFB: **${run.ttfb} ms** | FP: **${run.fp} ms** | FCP: **${run.fcp} ms** | LCP: **${run.lcp} ms** | TBT: **${run.tbt} ms**`);
  lines.push(`Total: **${fmtKb(run.totalBytes)}** transferred, **${run.requestCount}** requests`);
  lines.push('');
  lines.push('All times ms relative to navigation start.');
  lines.push('`renderBlocking` = Chrome 107+ `renderBlockingStatus` attribute on PerformancResourceTiming.');
  lines.push('');

  const sorted = [...(run.resources || [])].sort((a, b) => a.startTime - b.startTime);

  // Identify what was in-flight at First Paint
  const beforeFP  = sorted.filter(r => r.startTime < (run.fp  || Infinity) && (r.startTime + r.duration) > 0);
  const blocking  = sorted.filter(r => r.renderBlocking === 'blocking');

  lines.push('### Render-blocking path');
  lines.push('');
  if (blocking.length) {
    lines.push('Resources flagged `renderBlocking=blocking` by Chrome:');
    lines.push('');
    for (const r of blocking) {
      const short = r.name.replace(BASE_URL, '').slice(0, 80);
      lines.push(`- \`${short}\` (${r.initiatorType}, start=${r.startTime} ms, dur=${r.duration} ms, ${fmtKb(r.transferSize)})`);
    }
  } else {
    lines.push('No resources explicitly flagged `renderBlocking=blocking`. (May mean Chrome resolved blocking early or `renderBlockingStatus` is unsupported.)');
  }
  lines.push('');
  lines.push('Resources active at First Paint (`startTime < FP` and `start+duration > 0`):');
  lines.push('');
  const fpBlock = beforeFP.filter(r => r.startTime + r.duration > (run.fp || 0));
  if (fpBlock.length) {
    for (const r of fpBlock) {
      const short = r.name.replace(BASE_URL, '').slice(0, 80);
      lines.push(`- \`${short}\` (${r.initiatorType}, ${r.startTime}–${r.startTime + r.duration} ms)`);
    }
  } else {
    lines.push('None (all resources completed before First Paint, or FP=0).');
  }
  lines.push('');

  // Full waterfall table
  lines.push('### Full waterfall');
  lines.push('');
  lines.push('| # | Resource (truncated) | Type | Start | Dur | End | Size | renderBlocking |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- |');

  sorted.slice(0, 60).forEach((r, i) => {
    const short = r.name.replace(BASE_URL, '').replace('https://', '//').slice(0, 55);
    const end   = r.startTime + r.duration;
    const kb    = r.transferSize ? `${(r.transferSize / 1024).toFixed(1)} kB` : '0 B';
    const fpTag = (end >= (run.fp || 0) && r.startTime <= (run.fp || 0) && run.fp > 0) ? ' ←FP' : '';
    lines.push(`| ${i + 1} | \`${short}\` | ${r.initiatorType} | ${r.startTime} | ${r.duration} | ${Math.round(end)}${fpTag} | ${kb} | ${r.renderBlocking} |`);
  });

  if (sorted.length > 60) lines.push(`| … | (${sorted.length - 60} more — see results.json) | | | | | | |`);

  lines.push('');

  // Long tasks
  if (run.longTasks?.length) {
    lines.push('### Long Tasks (each >50 ms — contributes to TBT)');
    lines.push('');
    lines.push('| Start | Duration | Blocking portion |');
    lines.push('| --- | --- | --- |');
    for (const t of run.longTasks) {
      lines.push(`| ${t.start} ms | ${t.duration} ms | ${Math.max(0, t.duration - 50)} ms |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Job News SA — Performance Benchmark ===');
  console.log(`Target : ${BASE_URL}`);
  console.log(`Runs   : ${RUNS} cold + ${RUNS} warm per cell`);
  console.log(`Cells  : ${CONDITIONS.length} conditions × 5 pages = ${CONDITIONS.length * 5 * 2 * RUNS} total loads`);
  console.log('');

  mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  let jobSlug;
  try {
    jobSlug = await discoverSlug(browser);
  } catch (err) {
    console.error('WARN: Could not discover job slug:', err.message);
    jobSlug = 'unknown-slug';
  }

  const PAGES = [
    { id: 'homepage',            label: 'Homepage (/)',                      path: '/',                       auth: null },
    { id: 'jobs-listing',        label: 'Jobs listing (/jobs)',              path: '/jobs',                   auth: null },
    { id: 'job-detail',          label: `Job detail (/jobs/${jobSlug})`,     path: `/jobs/${jobSlug}`,        auth: null },
    { id: 'profile-edit',        label: 'Profile edit (/profile/edit)',      path: '/profile/edit',           auth: 'seeker' },
    { id: 'employer-dashboard',  label: 'Employer dashboard',                path: '/employer/dashboard',     auth: 'employer' },
  ];

  // Auth storage state files (written by Playwright setup tests)
  const AUTH_PATHS = {
    seeker:   resolve(ROOT, 'tests/.auth/seeker.json'),
    employer: resolve(ROOT, 'tests/.auth/employer.json'),
  };
  for (const [role, fp] of Object.entries(AUTH_PATHS)) {
    console.log(`Auth [${role}]: ${existsSync(fp) ? 'found' : 'MISSING — auth pages will benchmark the login redirect'}`);
  }
  console.log('');

  const rawData = {};       // rawData[condId][pageId] = { cold: [...], warm: [...] }
  const totalLoads = CONDITIONS.length * PAGES.length * 2 * RUNS;
  let completed = 0;

  for (const cond of CONDITIONS) {
    rawData[cond.id] = {};
    console.log(`\n--- ${cond.label} ---`);

    for (const pg of PAGES) {
      rawData[cond.id][pg.id] = { cold: [], warm: [] };

      const storagePath = pg.auth && existsSync(AUTH_PATHS[pg.auth])
        ? AUTH_PATHS[pg.auth]
        : null;
      const url = `${BASE_URL}${pg.path}`;

      for (const cacheState of ['cold', 'warm']) {
        process.stdout.write(`  [${cacheState}] ${pg.label}: `);

        for (let i = 0; i < RUNS; i++) {
          const result = await measure(browser, url, cond, storagePath, cacheState === 'warm');
          rawData[cond.id][pg.id][cacheState].push(result);

          if (result.failed) {
            process.stdout.write('ERR ');
          } else {
            const note = result.wasRedirected ? '*redir' : '';
            process.stdout.write(`${result.ttfb}ms${note} `);
          }

          completed++;
          await sleep(PAUSE_MS);
        }
        console.log(`  (${completed}/${totalLoads})`);
      }
    }

    // Save incrementally after each condition in case of interruption
    const snapshot = { jobSlug, pages: PAGES, conditions: CONDITIONS, data: rawData };
    writeFileSync(resolve(OUT_DIR, 'results.json'), JSON.stringify(snapshot, null, 2));
  }

  await browser.close();

  // ── Final outputs ─────────────────────────────────────────────────────────
  const structured = { jobSlug, pages: PAGES, conditions: CONDITIONS, data: rawData };

  const jsonPath = resolve(OUT_DIR, 'results.json');
  writeFileSync(jsonPath, JSON.stringify(structured, null, 2));
  console.log(`\nRaw data  -> ${jsonPath}`);

  const report  = buildReport(structured, jobSlug);
  const mdPath  = resolve(OUT_DIR, 'report.md');
  writeFileSync(mdPath, report);
  console.log(`Report    -> ${mdPath}`);

  // Waterfall for every page under Fast 3G cold (run 0)
  let wfCount = 0;
  for (const pg of PAGES) {
    const run = rawData['fast-3g']?.[pg.id]?.cold?.[0];
    if (run && !run.failed && run.resources?.length) {
      const wf     = buildWaterfall(run, `Fast 3G — ${pg.label}`);
      const wfPath = resolve(OUT_DIR, `waterfall-fast-3g-${pg.id}.md`);
      writeFileSync(wfPath, wf);
      wfCount++;
    }
  }
  console.log(`Waterfalls -> ${OUT_DIR}/waterfall-fast-3g-*.md (${wfCount} files)`);

  console.log('\nDone. Open perf-results/report.md for the full analysis.');
}

main().catch(err => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
