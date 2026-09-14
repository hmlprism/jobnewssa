import { Suspense } from "react";
import { SiteHeader } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/footer";
import { JobFilters } from "@/components/jobs/job-filters";
import { JobCard } from "@/components/jobs/job-card";
import {
  searchJobs,
  getAllSectors,
  type JobSearchFilters,
} from "@/lib/jobs-query";
import { Link } from "@/lib/navigation";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

// Category chip definition — labels resolved via translations inside the component.
type ChipDef = {
  label: string;
  key: string;
  val: string;
  clear?: string[];
};

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<JobSearchFilters>;
}) {
  const [filters, t] = await Promise.all([
    searchParams,
    getTranslations("Jobs"),
  ]);

  const [{ jobs, count, page, pageCount }, sectors] = await Promise.all([
    searchJobs(filters),
    getAllSectors(),
  ]);

  const activeSort = filters.sort ?? "newest";

  const CATEGORY_CHIPS: ChipDef[] = [
    { label: t("listing.chips.government"),      key: "sector",   val: "government-parastatals", clear: ["q"] },
    { label: t("listing.chips.learnerships"),    key: "q",        val: "learnership",            clear: ["sector"] },
    { label: t("listing.chips.internships"),     key: "contract", val: "internship" },
    { label: t("listing.chips.graduate"),        key: "q",        val: "graduate programme",     clear: ["sector"] },
    { label: t("listing.chips.apprenticeships"), key: "q",        val: "apprenticeship",         clear: ["sector"] },
    { label: t("listing.chips.bursaries"),       key: "q",        val: "bursary",                clear: ["sector"] },
    { label: t("listing.chips.partTime"),        key: "contract", val: "part_time" },
    { label: t("listing.chips.remote"),          key: "remote",   val: "true" },
  ];

  return (
    <>
      <SiteHeader />
      <main>

        {/* ── Classifieds section header ── */}
        <div className="border-b border-[var(--color-line)]">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">

            {/* Dateline: section title + count + sort — all on one strip */}
            <div className="flex items-baseline justify-between border-b border-[var(--color-line)] py-2.5">
              <h1 className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--color-muted)] select-none">
                {t("listing.dateline")}
              </h1>
              <div className="flex items-center gap-4">
                <span className="text-xs text-[var(--color-muted)]">
                  {count.toLocaleString()} {t("listing.positions", { count })}
                </span>
                <SortLink filters={filters} sort="newest"  activeSort={activeSort} label={t("listing.sortNewest")} />
                <SortLink filters={filters} sort="closing" activeSort={activeSort} label={t("listing.sortClosing")} />
              </div>
            </div>

            {/* Search bar — .search-form triggers the rust-on-focus CSS rule */}
            <form action="/jobs" className="search-form flex py-5">
              <label htmlFor="jobs-q" className="sr-only">
                {t("listing.searchInput")}
              </label>
              <input
                id="jobs-q"
                type="text"
                name="q"
                defaultValue={filters.q}
                placeholder={t("listing.searchInput")}
                className="min-w-0 flex-1 border border-r-0 border-[var(--color-line)] bg-[var(--color-paper)] px-4 py-3 text-sm"
              />
              <label htmlFor="jobs-location" className="sr-only">
                {t("listing.locationInput")}
              </label>
              <input
                id="jobs-location"
                type="text"
                name="location"
                defaultValue={filters.location}
                placeholder={t("listing.locationInput")}
                className="w-40 shrink-0 border border-r-0 border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-3 text-sm"
              />
              <button
                type="submit"
                className="shrink-0 cursor-pointer bg-[var(--color-rust)] px-6 py-3 text-sm font-medium text-[var(--color-paper)] hover:bg-[var(--color-rust-dark)]"
              >
                {t("listing.searchButton")}
              </button>
            </form>

            {/* Category chips — plain text links, no bordered pills */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pb-5">
              {CATEGORY_CHIPS.map((chip) => {
                const isActive =
                  (filters as Record<string, string>)[chip.key] === chip.val;
                return (
                  <Link
                    key={chip.val}
                    href={chipHref(filters, chip)}
                    prefetch={false}
                    className={`py-3 ${
                      isActive
                        ? "text-sm font-semibold text-[var(--color-rust)] underline underline-offset-2"
                        : "text-sm text-[var(--color-muted)] transition-colors duration-75 hover:text-[var(--color-ink)]"
                    }`}
                  >
                    {chip.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Sidebar + results ── */}
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="flex flex-col gap-8 md:flex-row">

            {/* Sidebar filters */}
            <Suspense
              fallback={<div className="w-full shrink-0 md:w-60 lg:w-64" />}
            >
              <JobFilters sectors={sectors} />
            </Suspense>

            {/* Results */}
            <div className="min-w-0 flex-1">
              {jobs.length === 0 ? (
                <div className="pb-16 pt-10">
                  <h2 className="text-xl font-semibold text-[var(--color-ink)]">
                    {t("listing.empty.heading")}
                  </h2>
                  <p className="mt-3 max-w-sm text-[var(--color-muted)]">
                    {t("listing.empty.body")}
                  </p>
                  <div className="mt-6 space-y-3 text-sm">
                    <div>
                      <Link
                        href="/jobs"
                        prefetch={false}
                        className="text-[var(--color-ink)] underline underline-offset-2 hover:text-[var(--color-rust)]"
                      >
                        {t("listing.empty.clearFilters")}
                      </Link>
                    </div>
                    <p className="text-[var(--color-muted)]">
                      {t.rich("listing.empty.alertText", {
                        link: (chunks) => (
                          <Link
                            href="/auth/signup"
                            prefetch={false}
                            className="text-[var(--color-ink)] underline underline-offset-2 hover:text-[var(--color-rust)]"
                          >
                            {chunks}
                          </Link>
                        ),
                      })}
                    </p>
                  </div>
                </div>
              ) : (
                // .job-list-results — stagger animation applied via CSS nth-child
                <div className="job-list-results">
                  {jobs.map((job) => (
                    <JobCard key={job.id} job={job} />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {pageCount > 1 && (
                <div className="mt-8 flex items-center justify-center gap-4 border-t border-[var(--color-line)] pt-6 text-sm">
                  {page > 1 && (
                    <PageLink filters={filters} page={page - 1} label={t("listing.pagination.previous")} />
                  )}
                  <span className="text-[var(--color-muted)]">
                    {t("listing.pagination.page", { page, total: pageCount })}
                  </span>
                  {page < pageCount && (
                    <PageLink filters={filters} page={page + 1} label={t("listing.pagination.next")} />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function chipHref(filters: JobSearchFilters, chip: ChipDef): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v != null && v !== "") p.set(k, String(v));
  }
  p.delete("page");
  const isActive = p.get(chip.key) === chip.val;
  if (isActive) {
    p.delete(chip.key);
  } else {
    for (const k of chip.clear ?? []) p.delete(k);
    p.set(chip.key, chip.val);
  }
  const qs = p.toString();
  return `/jobs${qs ? `?${qs}` : ""}`;
}

function SortLink({
  filters,
  sort,
  activeSort,
  label,
}: {
  filters: JobSearchFilters;
  sort: string;
  activeSort: string;
  label: string;
}) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v != null && v !== "") p.set(k, String(v));
  }
  if (sort === "newest") p.delete("sort"); else p.set("sort", sort);
  p.delete("page");
  const href = `/jobs${p.toString() ? `?${p.toString()}` : ""}`;
  const isActive = activeSort === sort;
  return (
    <Link
      href={href}
      prefetch={false}
      className={`text-xs py-3.5 ${
        isActive
          ? "font-semibold text-[var(--color-ink)] underline underline-offset-2"
          : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
      }`}
    >
      {label}
    </Link>
  );
}

function PageLink({
  filters,
  page,
  label,
}: {
  filters: JobSearchFilters;
  page: number;
  label: string;
}) {
  const params = new URLSearchParams({
    ...(filters as Record<string, string>),
    page: String(page),
  });
  return (
    <Link
      href={`/jobs?${params.toString()}`}
      prefetch={false}
      className="font-medium text-[var(--color-rust)] hover:underline"
    >
      {label}
    </Link>
  );
}
