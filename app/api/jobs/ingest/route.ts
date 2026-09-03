import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  searchAdzunaJobs,
  mapAdzunaContractType,
  splitAdzunaLocation,
  type AdzunaJob,
} from "@/lib/adzuna";
import { jobSlug } from "@/lib/slug";
import { randomUUID } from "crypto";

// Protects the endpoint so only Vercel Cron (or you, with the secret) can trigger ingestion.
function isAuthorized(request: Request): boolean {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

// A handful of SA cities to fan out searches across, since Adzuna's "where"
// param works best as a specific query rather than "South Africa" alone.
const SEARCH_LOCATIONS = [
  "Johannesburg",
  "Cape Town",
  "Durban",
  "Pretoria",
  "Port Elizabeth",
  "Bloemfontein",
];

async function upsertAdzunaJob(supabase: ReturnType<typeof createServiceClient>, job: AdzunaJob) {
  const { city, province } = splitAdzunaLocation(job);
  const id = randomUUID();

  const record = {
    id,
    company_id: null,
    company_name_raw: job.company?.display_name ?? "Confidential",
    posted_by: null,
    title: job.title,
    slug: jobSlug(job.title, city, id),
    description: job.description,
    sector_id: null, // resolved by tag-matching pass below
    province,
    city,
    is_remote: /remote|work from home/i.test(job.title + job.description),
    contract_type: mapAdzunaContractType(job),
    salary_min: job.salary_min ?? null,
    salary_max: job.salary_max ?? null,
    salary_currency: "ZAR",
    salary_is_market_related: !job.salary_min && !job.salary_max,
    source: "adzuna" as const,
    external_id: job.id,
    external_url: job.redirect_url,
    status: "published" as const,
    posted_at: job.created,
  };

  // de-dup on (source, external_id) via unique index; upsert keeps listings fresh
  const { error } = await supabase
    .from("jobs")
    .upsert(record, { onConflict: "source,external_id", ignoreDuplicates: false });

  if (error) throw error;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  let totalIngested = 0;
  const errors: string[] = [];

  for (const where of SEARCH_LOCATIONS) {
    try {
      const { results } = await searchAdzunaJobs({ where, resultsPerPage: 50, page: 1 });
      for (const job of results) {
        try {
          await upsertAdzunaJob(supabase, job);
          totalIngested += 1;
        } catch (e) {
          errors.push(`job ${job.id}: ${(e as Error).message}`);
        }
      }
    } catch (e) {
      errors.push(`location ${where}: ${(e as Error).message}`);
    }
  }

  return NextResponse.json({
    ingested: totalIngested,
    locations_processed: SEARCH_LOCATIONS.length,
    errors: errors.length ? errors : undefined,
  });
}

// Allow manual GET trigger in development only
export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Use POST with cron secret" }, { status: 405 });
  }
  return POST(request);
}
