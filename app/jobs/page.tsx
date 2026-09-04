import { SiteHeader } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/footer";
import { JobFilters } from "@/components/jobs/job-filters";
import { JobCard } from "@/components/jobs/job-card";
import { searchJobs, getAllSectors, type JobSearchFilters } from "@/lib/jobs-query";
import Link from "next/link";
import { Search } from "lucide-react";

export const metadata = { title: "Find jobs in South Africa" };
export const revalidate = 60;

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

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <form action="/jobs" className="mb-8 flex gap-2">
          <div className="relative flex-1">
            <Search
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
            />
            <input
              type="text"
              name="q"
              defaultValue={filters.q}
              placeholder="Job title, keyword, or company"
              className="w-full border border-[var(--color-line)] bg-[var(--color-paper)] py-3 pl-10 pr-4 text-sm"
            />
          </div>
          <button
            type="submit"
            className="cursor-pointer bg-[var(--color-ink)] px-6 py-3 text-sm font-medium text-[var(--color-paper)] hover:bg-[var(--color-ink)]/90"
          >
            Search
          </button>
        </form>

        <div className="flex flex-col gap-8 md:flex-row">
          <JobFilters sectors={sectors} />

          <div className="min-w-0 flex-1">
            <div className="mb-4 flex items-center justify-between">
              <h1 className="font-display text-xl">
                {count.toLocaleString()} South Africa job{count === 1 ? "" : "s"}
              </h1>
            </div>

            {jobs.length === 0 ? (
              <div className="border-t border-[var(--color-line)] pb-16 pt-10">
                <h2 className="font-display text-2xl">No listings match — yet.</h2>
                <p className="mt-3 max-w-sm text-[var(--color-muted)]">
                  The market moves quickly. Try a broader keyword, a different province, or remove a filter.
                </p>
                <div className="mt-6 space-y-3 text-sm">
                  <div>
                    <Link
                      href="/jobs"
                      className="text-[var(--color-ink)] underline underline-offset-2 hover:text-[var(--color-rust)]"
                    >
                      Clear all filters
                    </Link>
                  </div>
                  <p className="text-[var(--color-muted)]">
                    Want to be notified when matching roles are posted?{" "}
                    <Link
                      href="/auth/signup"
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

            {pageCount > 1 && (
              <div className="mt-8 flex items-center justify-center gap-4 text-sm">
                {page > 1 && (
                  <PageLink filters={filters} page={page - 1} label="Previous" />
                )}
                <span className="text-[var(--color-muted)]">
                  Page {page} of {pageCount}
                </span>
                {page < pageCount && (
                  <PageLink filters={filters} page={page + 1} label="Next" />
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
    <Link href={`/jobs?${params.toString()}`} className="text-[var(--color-rust)] hover:underline">
      {label}
    </Link>
  );
}
