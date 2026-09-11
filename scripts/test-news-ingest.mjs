#!/usr/bin/env node
/**
 * test-news-ingest.mjs — manually trigger the news ingestion endpoint once.
 *
 * Usage:
 *   1. Apply migration 0016 in Supabase (dashboard SQL editor or `supabase db push`)
 *   2. Start the dev server: npm run dev
 *   3. In another terminal: node scripts/test-news-ingest.mjs
 *
 * Or to test against a deployed environment (e.g. preview branch):
 *   BASE_URL=https://your-preview.vercel.app node scripts/test-news-ingest.mjs
 *
 * Reads CRON_SECRET from .env.local — the same secret Vercel Cron uses.
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Load .env.local ──────────────────────────────────────────────────────────

function loadEnvLocal() {
  const envPath = resolve(__dirname, "../.env.local");
  try {
    const content = readFileSync(envPath, "utf-8");
    const env = {};
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      env[key] = value;
    }
    return env;
  } catch {
    return {};
  }
}

const env = loadEnvLocal();
const CRON_SECRET = env.CRON_SECRET;
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

if (!CRON_SECRET) {
  console.error("No CRON_SECRET found in .env.local — POST auth will fail.");
  console.error("Either add CRON_SECRET to .env.local or use the dev GET endpoint:");
  console.error(`  open ${BASE_URL}/api/news/ingest  (dev server only, no auth needed)`);
  process.exit(1);
}

// ─── Run ingestion ────────────────────────────────────────────────────────────

const url = `${BASE_URL}/api/news/ingest`;
console.log(`POST ${url}`);
console.log("");

const start = Date.now();
let res;
try {
  res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${CRON_SECRET}` },
  });
} catch (e) {
  console.error(`Network error: ${e.message}`);
  console.error("Is the dev server running? Start it with: npm run dev");
  process.exit(1);
}

const elapsed = Date.now() - start;
const data = await res.json();

if (!res.ok) {
  console.error(`HTTP ${res.status}:`, data);
  process.exit(1);
}

// ─── Print results ────────────────────────────────────────────────────────────

console.log(`Completed in ${elapsed}ms\n`);
console.log(`Feeds processed : ${data.feeds_processed}`);
console.log(`Filtered out    : ${data.filtered_out}  (did not match employment keywords)`);
console.log(`Already existed : ${data.already_existed ?? 0}  (duplicate source_url, skipped)`);
console.log(`Newly ingested  : ${data.ingested}`);

if (data.articles?.length) {
  console.log("\nArticles stored this run:");
  for (const a of data.articles) {
    console.log(`  [${a.source}] ${a.title}`);
  }
} else {
  console.log("\nNo new articles stored this run.");
  console.log("(This is normal if all matching articles are already in the DB,");
  console.log(" or if today's feeds have no employment-relevant items.)");
}

if (data.errors?.length) {
  console.log("\nErrors:");
  for (const e of data.errors) {
    console.log(`  ⚠  ${e}`);
  }
}
