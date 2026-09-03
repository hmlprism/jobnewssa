// Adzuna Jobs API client — South Africa (country code "za")
// Docs: https://developer.adzuna.com/overview

const ADZUNA_BASE = "https://api.adzuna.com/v1/api/jobs/za";

export interface AdzunaJob {
  id: string;
  title: string;
  description: string;
  redirect_url: string;
  company: { display_name: string };
  location: { display_name: string; area: string[] };
  salary_min?: number;
  salary_max?: number;
  contract_type?: string; // "permanent" | "contract"
  contract_time?: string; // "full_time" | "part_time"
  category: { label: string; tag: string };
  created: string; // ISO date
}

interface AdzunaSearchResponse {
  results: AdzunaJob[];
  count: number;
}

export interface AdzunaSearchParams {
  page?: number; // 1-indexed
  what?: string; // keywords
  where?: string; // location e.g. "Cape Town"
  category?: string; // adzuna category tag
  resultsPerPage?: number; // max 50
}

export async function searchAdzunaJobs(
  params: AdzunaSearchParams = {}
): Promise<AdzunaSearchResponse> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    throw new Error(
      "Missing ADZUNA_APP_ID / ADZUNA_APP_KEY environment variables."
    );
  }

  const page = params.page ?? 1;
  const url = new URL(`${ADZUNA_BASE}/search/${page}`);
  url.searchParams.set("app_id", appId);
  url.searchParams.set("app_key", appKey);
  url.searchParams.set("results_per_page", String(params.resultsPerPage ?? 50));
  url.searchParams.set("content-type", "application/json");

  if (params.what) url.searchParams.set("what", params.what);
  if (params.where) url.searchParams.set("where", params.where);
  if (params.category) url.searchParams.set("category", params.category);

  const res = await fetch(url.toString(), {
    // ingestion runs server-side on a schedule; no need for Next.js caching
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Adzuna API error ${res.status}: ${body}`);
  }

  return res.json();
}

// Map Adzuna's free-text contract fields to our enum
export function mapAdzunaContractType(job: AdzunaJob): string {
  if (job.contract_time === "part_time") return "part_time";
  if (job.contract_type === "contract") return "contract";
  return "permanent";
}

// Adzuna location.display_name is often "City, Province, South Africa" —
// best-effort split; falls back gracefully if the format varies.
export function splitAdzunaLocation(job: AdzunaJob): {
  city: string | null;
  province: string | null;
} {
  const parts = job.location?.area ?? [];
  // area[] is ordered broad -> specific in Adzuna, e.g. ["South Africa", "Gauteng", "Johannesburg"]
  const province = parts.length >= 2 ? parts[1] : null;
  const city = parts.length >= 3 ? parts[parts.length - 1] : job.location?.display_name ?? null;
  return { city, province };
}
