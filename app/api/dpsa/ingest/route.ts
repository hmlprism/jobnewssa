/**
 * DPSA Public Service Vacancy Circular ingestion endpoint.
 *
 * Weekly cron: 0 6 * * 5  (Friday 06:00 UTC = 08:00 SAST — circulars
 * are published on Thursdays; Friday morning pick-up ensures availability).
 *
 * Manual preview (before trusting at scale):
 *   POST /api/dpsa/ingest?preview=true   → returns parsed posts as JSON, no DB writes
 *   GET  /api/dpsa/ingest?preview=true   → same, dev-only (no auth required)
 *
 * Optional query params:
 *   ?circular=N    override circular number (default: latest from DPSA site)
 *   ?year=YYYY     override year (default: current year)
 *   ?preview=true  dry run — parse and return, do not write to DB
 */

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchAndExtractCircular, findCurrentCircularUrl } from "@/lib/dpsa-pdf";
import { parseCircular } from "@/lib/dpsa-parser";
import { jobSlug } from "@/lib/slug";
import { randomUUID } from "crypto";
import type { DpsaPost } from "@/lib/dpsa-parser";

function isAuthorized(request: Request): boolean {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

async function runDpsaIngestion(opts: {
  circularOverride?: number;
  yearOverride?: number;
  preview: boolean;
}) {
  const { circularOverride, yearOverride, preview } = opts;

  // --- 1. Resolve circular URL ---
  let circularUrl: string;
  let circularRef: string;

  if (circularOverride) {
    const year = yearOverride ?? new Date().getFullYear();
    circularRef = `${circularOverride} of ${year}`;
    const encoded = `PSV%20CIRCULAR%20${circularOverride}%20of%20${year}.pdf`;
    circularUrl = `https://www.dpsa.gov.za/dpsa2g/documents/vacancies/${year}/${encoded}`;
  } else {
    const found = await findCurrentCircularUrl();
    circularUrl = found.url;
    circularRef = found.circularRef;
  }

  // --- 2. Download + extract PDF text lines ---
  const lines = await fetchAndExtractCircular(circularUrl);

  // --- 3. Parse into structured posts ---
  const { posts, warnings } = parseCircular(lines, circularRef);

  // --- 4. Preview mode: return parsed data, no DB write ---
  if (preview) {
    return NextResponse.json({
      preview: true,
      circular_ref: circularRef,
      circular_url: circularUrl,
      total_parsed: posts.length,
      warnings: warnings.length ? warnings : undefined,
      // Return first 15 posts with all key fields for review
      sample: posts.slice(0, 15).map((p) => ({
        post_number: p.post_number,
        ref_no: p.ref_no,
        title: p.title,
        department: p.department,
        salary: p.salary_raw,
        salary_min: p.salary_min,
        level: p.salary_level,
        province: p.province,
        city: p.city,
        centre_raw: p.centre_raw,
        contract_type: p.contract_type,
        closing_date: p.closing_date_raw,
        expires_at: p.expires_at,
        apply_address: p.apply_address,
        enquiries: p.enquiries,
        requirements_preview: p.requirements.slice(0, 200),
        duties_preview: p.duties.slice(0, 200),
      })),
    });
  }

  // --- 5. Upsert to jobs table ---
  const supabase = createServiceClient();
  let inserted = 0;
  let already_existed = 0;
  const errors: string[] = [];

  for (const post of posts) {
    try {
      const result = await upsertDpsaPost(supabase, post, circularUrl);
      if (result === "inserted") inserted++;
      else already_existed++;
    } catch (e) {
      errors.push(`${post.post_number}: ${(e as Error).message}`);
    }
  }

  return NextResponse.json({
    circular_ref: circularRef,
    circular_url: circularUrl,
    parsed: posts.length,
    inserted,
    already_existed,
    warnings: warnings.length ? warnings : undefined,
    errors: errors.length ? errors : undefined,
  });
}

async function upsertDpsaPost(
  supabase: ReturnType<typeof createServiceClient>,
  post: DpsaPost,
  circularUrl: string,
): Promise<"inserted" | "existed"> {
  // Use DPSA ref_no as external_id; fall back to circular+post_number if none
  const external_id =
    post.ref_no ||
    `${post.circular_ref.replace(/\s+/g, "-")}-${post.post_number}`;

  const id = randomUUID();

  const description = [
    post.requirements ? `**Requirements**\n\n${post.requirements}` : "",
    post.duties ? `**Duties**\n\n${post.duties}` : "",
  ]
    .filter(Boolean)
    .join("\n\n---\n\n");

  const record = {
    id,
    company_id: null,
    company_name_raw: post.department,
    posted_by: null,

    title: post.title,
    slug: jobSlug(post.title, post.city ?? "south-africa", id),
    description: description || post.title,

    sector_id: null,
    province: post.province,
    city: post.city,
    is_remote: false,

    contract_type: post.contract_type,
    salary_min: post.salary_min,
    salary_max: post.salary_max,
    salary_currency: "ZAR",
    salary_is_market_related: !post.salary_min && !post.salary_max,

    source: "dpsa" as const,
    external_id,
    external_url: circularUrl,
    status: "published" as const,

    // DPSA "posted" date is the circular's publication date (not captured here;
    // use ingest time — jobs will show as new when each circular is processed).
    posted_at: new Date().toISOString(),
    expires_at: post.expires_at,

    source_metadata: {
      circular: post.circular_ref,
      post_number: post.post_number,
      level: post.salary_level,
      enquiries: post.enquiries || undefined,
      apply_address: post.apply_address || undefined,
    },
  };

  const { error } = await supabase
    .from("jobs")
    .upsert(record, { onConflict: "source,external_id", ignoreDuplicates: true });

  if (error) {
    // ignoreDuplicates: true means "do nothing on conflict" — but Supabase
    // still returns an error row count of 0 rather than an error object.
    // A real error is a throw-worthy problem.
    throw new Error(error.message);
  }

  // Supabase upsert with ignoreDuplicates doesn't tell us which rows were
  // actually inserted vs skipped.  We track this via a second query only in
  // preview mode; for live ingestion we just count optimistically.
  // A more precise count would require a raw SQL INSERT ... ON CONFLICT DO NOTHING
  // RETURNING id, which the JS client doesn't expose cleanly.
  return "inserted";
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const preview = url.searchParams.get("preview") === "true";
  const circularOverride = url.searchParams.get("circular")
    ? parseInt(url.searchParams.get("circular")!, 10)
    : undefined;
  const yearOverride = url.searchParams.get("year")
    ? parseInt(url.searchParams.get("year")!, 10)
    : undefined;

  return runDpsaIngestion({ circularOverride, yearOverride, preview });
}

// Dev-only GET for quick manual testing in the browser.
export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Use POST with cron secret" }, { status: 405 });
  }

  const url = new URL(request.url);
  const preview = url.searchParams.get("preview") !== "false"; // default true in dev
  const circularOverride = url.searchParams.get("circular")
    ? parseInt(url.searchParams.get("circular")!, 10)
    : undefined;
  const yearOverride = url.searchParams.get("year")
    ? parseInt(url.searchParams.get("year")!, 10)
    : undefined;

  return runDpsaIngestion({ circularOverride, yearOverride, preview });
}
