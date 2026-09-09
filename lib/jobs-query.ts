import { createClient as createRawClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import type { Job } from "@/types/database";

export interface JobSearchFilters {
  q?: string;
  location?: string;
  province?: string;
  sector?: string;
  contract?: string;
  min_salary?: string;
  remote?: string;
  sort?: string; // "newest" (default) | "closing"
  page?: string;
  limit?: number;
}

const PAGE_SIZE = 20;

// Fields needed by JobCard — omits description (potentially huge) and other
// columns not rendered in the listing view. getJobBySlug keeps full select.
// NOTE: is_urgent requires migration 0013 to be applied first.
const LISTING_SELECT =
  "id, title, slug, company_name_raw, province, city, is_remote, " +
  "contract_type, salary_min, salary_max, salary_is_market_related, " +
  "source, posted_at, expires_at, is_urgent, " +
  "company:companies(id, name, slug, verified)";

// Cached job search — public data, no auth context needed.
// Cache key includes serialized filters; 60 s TTL per unique filter combo.
async function _searchJobsImpl(filterJson: string) {
  const filters: JobSearchFilters = JSON.parse(filterJson);
  const supabase = createRawClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const pageSize = filters.limit ?? PAGE_SIZE;
  const page = Math.max(1, parseInt(filters.page ?? "1", 10) || 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // When filtering by sector, use !inner join so PostgREST filters parent rows
  // directly — no separate sector-ID round-trip needed.
  const sectorJoin = filters.sector
    ? "sector:sectors!inner(id, name, slug)"
    : "sector:sectors(id, name, slug)";

  let query = supabase
    .from("jobs")
    .select(`${LISTING_SELECT}, ${sectorJoin}`, { count: "exact" })
    .eq("status", "published")
    .range(from, to);

  if (filters.q) {
    query = query.textSearch("search_vector", filters.q, { type: "websearch" });
  }
  if (filters.province) {
    query = query.ilike("province", `%${filters.province.replace(/-/g, " ")}%`);
  }
  if (filters.contract) {
    query = query.eq("contract_type", filters.contract);
  }
  if (filters.min_salary) {
    query = query.gte("salary_min", parseInt(filters.min_salary, 10));
  }
  if (filters.location) {
    query = query.or(
      `city.ilike.%${filters.location}%,province.ilike.%${filters.location}%`
    );
  }
  if (filters.remote === "true") {
    query = query.eq("is_remote", true);
  }
  if (filters.sector) {
    query = query.eq("sector.slug", filters.sector);
  }

  // Sort order — "closing" shows jobs with upcoming expiry first (soonest
  // first), nulls last; expired jobs are excluded so they don't top the list.
  // "newest" (default) sorts by posted_at descending.
  if (filters.sort === "closing") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    query = query
      .or(`expires_at.gte.${today.toISOString()},expires_at.is.null`)
      .order("expires_at", { ascending: true, nullsFirst: false });
  } else {
    query = query.order("posted_at", { ascending: false });
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("searchJobs error:", error.message);
    return { jobs: [] as Job[], count: 0, page, pageCount: 0 };
  }

  return {
    jobs: (data ?? []) as unknown as Job[],
    count: count ?? 0,
    page,
    pageCount: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
  };
}

const _cachedSearchJobs = unstable_cache(
  _searchJobsImpl,
  ["search-jobs"],
  { revalidate: 60, tags: ["jobs"] }
);

export async function searchJobs(filters: JobSearchFilters) {
  // Serialize filters to a stable JSON string for the cache key.
  // Only include non-empty values so default /jobs hits the same cache entry.
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(filters)) {
    if (v != null && v !== "" && v !== undefined) clean[k] = String(v);
  }
  const filterJson = JSON.stringify(clean, Object.keys(clean).sort());
  return _cachedSearchJobs(filterJson);
}

// Homepage: 8 most-recent published jobs, cached 60 s.
// Uses a plain anon client — no cookies — so unstable_cache can persist the
// result across requests without being forced dynamic.
const _cachedRecentJobs = unstable_cache(
  async () => {
    const supabase = createRawClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase
      .from("jobs")
      .select(`${LISTING_SELECT}, sector:sectors(id, name, slug)`)
      .eq("status", "published")
      .order("posted_at", { ascending: false })
      .range(0, 7);
    return (data ?? []) as unknown as Job[];
  },
  ["recent-jobs-home"],
  { revalidate: 60, tags: ["jobs"] }
);

export async function getCachedRecentJobs() {
  return _cachedRecentJobs();
}

// Total count of published jobs for the "N vacancies live" stat, cached 60 s.
// Uses a HEAD request (head: true) so PostgREST returns only the count header,
// no row data transferred.
const _cachedJobCount = unstable_cache(
  async () => {
    const supabase = createRawClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { count } = await supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "published");
    return count ?? 0;
  },
  ["published-job-count"],
  { revalidate: 60, tags: ["jobs"] }
);

export async function getCachedJobCount() {
  return _cachedJobCount();
}

// Sectors change rarely — cache for 1 hour. Uses a plain anon client (no
// cookies) so it can safely run inside unstable_cache's cross-request scope.
const getCachedSectors = unstable_cache(
  async () => {
    const supabase = createRawClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase.from("sectors").select("*").order("name");
    return data ?? [];
  },
  ["all-sectors"],
  { revalidate: 3600, tags: ["sectors"] }
);

export async function getAllSectors() {
  return getCachedSectors();
}

// Cross-request cache for job detail pages — 120 s TTL, tagged "jobs".
// Uses a plain anon client (no cookies) so unstable_cache can persist the
// result across requests. Per-container behavior is expected (not a bug).
const _cachedJobBySlug = unstable_cache(
  async (slug: string) => {
    const supabase = createRawClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase
      .from("jobs")
      .select("*, company:companies(*), sector:sectors(*)")
      .eq("slug", slug)
      .eq("status", "published")
      .single();
    return data as unknown as Job | null;
  },
  ["job-detail"],
  { revalidate: 120, tags: ["jobs"] }
);

// React.cache deduplicates within a single render so generateMetadata and
// the page component share one unstable_cache lookup rather than two.
export const getJobBySlug = cache(async (slug: string) => {
  return _cachedJobBySlug(slug);
});

// ── Category sections (homepage) ─────────────────────────────────────────────
// Each returns up to 6 most-recent published jobs matching the category.
// Uses raw anon client (no cookies) + unstable_cache so results are shared
// across requests (same caching pattern as _cachedRecentJobs).

// Shared select for category cards — uses !inner on sectors so the sector
// filter eliminates non-matching parent rows (same pattern as _searchJobsImpl).
const GOVT_SELECT = `${LISTING_SELECT}, sector:sectors!inner(id, name, slug)`;
const CATEGORY_SELECT = `${LISTING_SELECT}, sector:sectors(id, name, slug)`;

const _cachedGovtJobs = unstable_cache(
  async () => {
    const supabase = createRawClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase
      .from("jobs")
      .select(GOVT_SELECT)
      .eq("status", "published")
      .eq("sector.slug", "government-parastatals")
      .order("posted_at", { ascending: false })
      .range(0, 5);
    return (data ?? []) as unknown as Job[];
  },
  ["category-govt-jobs"],
  { revalidate: 120, tags: ["jobs"] }
);

const _cachedInternshipJobs = unstable_cache(
  async () => {
    const supabase = createRawClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase
      .from("jobs")
      .select(CATEGORY_SELECT)
      .eq("status", "published")
      .eq("contract_type", "internship")
      .order("posted_at", { ascending: false })
      .range(0, 5);
    return (data ?? []) as unknown as Job[];
  },
  ["category-internship-jobs"],
  { revalidate: 120, tags: ["jobs"] }
);

const _cachedLearnershipJobs = unstable_cache(
  async () => {
    const supabase = createRawClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase
      .from("jobs")
      .select(CATEGORY_SELECT)
      .eq("status", "published")
      .textSearch("search_vector", "learnership", { type: "websearch" })
      .order("posted_at", { ascending: false })
      .range(0, 5);
    return (data ?? []) as unknown as Job[];
  },
  ["category-learnership-jobs"],
  { revalidate: 120, tags: ["jobs"] }
);

const _cachedGraduateJobs = unstable_cache(
  async () => {
    const supabase = createRawClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase
      .from("jobs")
      .select(CATEGORY_SELECT)
      .eq("status", "published")
      .textSearch("search_vector", "graduate", { type: "websearch" })
      .order("posted_at", { ascending: false })
      .range(0, 5);
    return (data ?? []) as unknown as Job[];
  },
  ["category-graduate-jobs"],
  { revalidate: 120, tags: ["jobs"] }
);

export async function getCachedGovtJobs() { return _cachedGovtJobs(); }
export async function getCachedInternshipJobs() { return _cachedInternshipJobs(); }
export async function getCachedLearnershipJobs() { return _cachedLearnershipJobs(); }
export async function getCachedGraduateJobs() { return _cachedGraduateJobs(); }
