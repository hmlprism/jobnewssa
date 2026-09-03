import { createClient } from "@/lib/supabase/server";
import type { Job } from "@/types/database";

export interface JobSearchFilters {
  q?: string;
  province?: string;
  sector?: string;
  contract?: string;
  min_salary?: string;
  remote?: string;
  page?: string;
}

const PAGE_SIZE = 20;

export async function searchJobs(filters: JobSearchFilters) {
  const supabase = await createClient();
  const page = Math.max(1, parseInt(filters.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("jobs")
    .select("*, company:companies(*), sector:sectors(*)", { count: "exact" })
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
    const { data: sectorRow } = await supabase
      .from("sectors")
      .select("id")
      .eq("slug", filters.sector)
      .single();
    if (sectorRow) {
      query = query.eq("sector_id", sectorRow.id);
    }
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
    pageCount: Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE)),
  };
}

export async function getAllSectors() {
  const supabase = await createClient();
  const { data } = await supabase.from("sectors").select("*").order("name");
  return data ?? [];
}

export async function getJobBySlug(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("jobs")
    .select("*, company:companies(*), sector:sectors(*)")
    .eq("slug", slug)
    .eq("status", "published")
    .single();
  return data as unknown as Job | null;
}
