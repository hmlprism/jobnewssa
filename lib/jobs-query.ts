import { createClient } from "@/lib/supabase/server";
import { createClient as createRawClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import type { Job } from "@/types/database";

export interface JobSearchFilters {
  q?: string;
  province?: string;
  sector?: string;
  contract?: string;
  min_salary?: string;
  remote?: string;
  page?: string;
  limit?: number;
}

const PAGE_SIZE = 20;

// Fields needed by JobCard — omits description (potentially huge) and other
// columns not rendered in the listing view. getJobBySlug keeps full select.
const LISTING_SELECT =
  "id, title, slug, company_name_raw, province, city, is_remote, " +
  "contract_type, salary_min, salary_max, salary_is_market_related, " +
  "source, posted_at, expires_at, " +
  "company:companies(id, name, slug, verified)";

export async function searchJobs(filters: JobSearchFilters) {
  const supabase = await createClient();
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
    .order("posted_at", { ascending: false })
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
  if (filters.remote === "true") {
    query = query.eq("is_remote", true);
  }
  if (filters.sector) {
    // Filter on the embedded sector alias — resolved by PostgREST in one query.
    query = query.eq("sector.slug", filters.sector);
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
