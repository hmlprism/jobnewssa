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
import Link from "next/link";
import { Search, MapPin } from "lucide-react";

export const metadata = { title: "Find jobs in South Africa" };

// Category chips — map each label to the URL param it sets/clears.
// Clicking an active chip deactivates it; clicking inactive sets it
// (and clears any conflicting params listed in `clear`).
type ChipDef = {
  label: string;
  key: string;
  val: string;
  clear?: string[];
};

const CATEGORY_CHIPS: ChipDef[] = [
  { label: "Government Vacancies", key: "sector",   val: "government-parastatals", clear: ["q"] },
  { label: "Learnerships",         key: "q",        val: "learnership",             clear: ["sector"] },
  { label: "Internships",          key: "contract", val: "internship" },
  { label: "Graduate Programmes",  key: "q",        val: "graduate programme",      clear: ["sector"] },
  { label: "Apprenticeships",      key: "q",        val: "apprenticeship",          clear: ["sector"] },
  { label: "Bursaries",            key: "q",        val: "bursary",                 clear: ["sector"] },
  { label: "Part-Time",            key: "contract", val: "part_time" },
  { label: "Remote",               key: "remote",   val: "true" },
];

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<JobSearchFilters>;
}) {
  const filters = await searchParams;
  const [{ jobs, count, page, pageCount }, sectors] = await Promise.all([
    searchJobs(filters),
    getAllSectors(),
  ]);

  const activeSort = filters.sort ?? "newest";

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* ── Search bar ── */}
        <form action="/jobs" className="mb-6 flex">
          <div className="relative flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
            />
            <input
              type="text"
              name="q"
              defaultValue={filters.q}
              placeholder="Job title, keyword, or company"
              className="w-full border border-r-0 border-[var(--color-line)] bg-[var(--color-paper)] py-3 pl-10 pr-3 text-sm"
            />
          </div>
          <div className="relative w-44 shrink-0">
            <MapPin
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
            />
            <input
              type="text"
              name="location"
              defaultValue={filters.location}
              placeholder="City or province"
              className="w-full border border-r-0 border-[var(--color-line)] bg-[var(--color-paper)] py-3 pl-8 pr-3 text-sm"
            />
          </div>
          <button
            type="submit"
            className="cursor-pointer bg-[var(--color-ink)] px-6 py-3 text-sm font-medium text-[var(--color-paper)] hover:bg-[var(--color-ink)]/90"
          >
            Search
          </button>
        </form>

        {/* ── Category chips ── */}
        <div className="mb-6 flex flex-wrap gap-2">
          {CATEGORY_CHIPS.map((chip) => {
            const isActive =
              (filters as Record<string, string>)[chip.key] === chip.val;
            return (
              <Link
                key={chip.label}
                href={chipHref(filters, chip)}
                prefetch={false}
                className={`border px-3 py-1.5 text-xs font-medium transition-colors duration-75 ${
                  isActive
                    ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)]"
                    : "border-[var(--color-line)] text-[var(--color-ink)] hover:border-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-[var(--color-paper)]"
                }`}
              >
                {chip.label}
              </Link>
            );
          })}
        </div>

        <div className="flex flex-col gap-8 md:flex-row">
          {/* ── Sidebar filters ── */}
          <Suspense
            fallback={<div className="w-full shrink-0 md:w-60 lg:w-64" />}
          >
            <JobFilters sectors={sectors} />
          </Suspense>

          {/* ── Results ── */}
          <div className="min-w-0 flex-1">
            {/* Results header + sort tabs */}
            <div className="mb-4 flex items-baseline justify-between border-b border-[var(--color-line)] pb-4">
              <h1 className="text-base font-semibold text-[var(--color-ink)]">
                {count.toLocaleString()} South Africa job
                {count === 1 ? "" : "s"}
              </h1>
              <div className="flex items-center gap-4">
                <SortLink filters={filters} sort="newest" activeSort={activeSort} label="Newest" />
                <SortLink filters={filters} sort="closing" activeSort={activeSort} label="Closing soon" />
              </div>
            </div>

            {jobs.length === 0 ? (
              <div className="pb-16 pt-10">
                <h2 className="font-display text-2xl">
                  No listings match — yet.
                </h2>
                <p className="mt-3 max-w-sm text-[var(--color-muted)]">
                  The market moves quickly. Try a broader keyword, a different
                  province, or remove a filter.
                </p>
                <div className="mt-6 space-y-3 text-sm">
                  <div>
                    <Link
                      href="/jobs"
                      prefetch={false}
                      className="text-[var(--color-ink)] underline underline-offset-2 hover:text-[var(--color-rust)]"
                    >
                      Clear all filters
                    </Link>
                  </div>
                  <p className="text-[var(--color-muted)]">
                    Want to be notified when matching roles are posted?{" "}
                    <Link
                      href="/auth/signup"
                      prefetch={false}
                      className="text-[var(--color-ink)] underline underline-offset-2 hover:text-[var(--color-rust)]"
                    >
                      Create a free account
                    </Link>{" "}
                    and set up a job alert.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                {jobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {pageCount > 1 && (
              <div className="mt-8 flex items-center justify-center gap-4 border-t border-[var(--color-line)] pt-6 text-sm">
                {page > 1 && (
                  <PageLink
                    filters={filters}
                    page={page - 1}
                    label="← Previous"
                  />
                )}
                <span className="text-[var(--color-muted)]">
                  Page {page} of {pageCount}
                </span>
                {page < pageCount && (
                  <PageLink
                    filters={filters}
                    page={page + 1}
                    label="Next →"
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Build a URL that toggles a category chip on/off, preserving all other params. */
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

/** Sort tab link — underlined + bold when active, muted otherwise. */
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
      className={`text-sm ${
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
