import { SiteHeader } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/footer";
import { JobCard } from "@/components/jobs/job-card";
import {
  getCachedRecentJobs,
  getCachedJobCount,
  getAllSectors,
} from "@/lib/jobs-query";
import Link from "next/link";
import { Search, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [recentJobs, count, sectors] = await Promise.all([
    getCachedRecentJobs(),
    getCachedJobCount(),
    getAllSectors(),
  ]);

  const topSectors = sectors.slice(0, 12);

  return (
    <>
      <SiteHeader />

      <main>
        {/* ── Hero ── */}
        <section className="border-b border-[var(--color-line)] bg-[var(--color-paper)]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:py-28">
            <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
              {count.toLocaleString()} vacancies across South Africa
            </p>
            <h1 className="max-w-2xl font-display text-4xl font-semibold leading-[1.08] sm:text-5xl lg:text-[3.5rem]">
              Find real work, anywhere in South&nbsp;Africa.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-[var(--color-muted)]">
              Search vacancies across every province and sector — from Gauteng
              finance desks to Western Cape farms. No noise, no fake listings.
            </p>

            {/* Search bar */}
            <form
              action="/jobs"
              className="mt-10 flex max-w-xl gap-0"
            >
              <div className="relative flex-1">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
                />
                <input
                  type="text"
                  name="q"
                  placeholder="Job title or keyword"
                  className="w-full border border-r-0 border-[var(--color-line)] bg-[var(--color-paper)] py-3.5 pl-11 pr-4 text-sm placeholder:text-[var(--color-muted)]"
                />
              </div>
              <button
                type="submit"
                className="cursor-pointer bg-[var(--color-rust)] px-7 py-3.5 text-sm font-medium text-[var(--color-paper)] hover:bg-[var(--color-rust-dark)]"
              >
                Search jobs
              </button>
            </form>

            {/* Quick links */}
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-1 text-sm text-[var(--color-muted)]">
              <span>Popular:</span>
              {["Remote", "Johannesburg", "Cape Town", "Part-Time"].map(
                (term) => (
                  <Link
                    key={term}
                    href={`/jobs?q=${encodeURIComponent(term)}`}
                    prefetch={false}
                    className="text-[var(--color-ink)] underline decoration-[var(--color-line)] underline-offset-2 hover:text-[var(--color-rust)] hover:decoration-[var(--color-rust)]"
                  >
                    {term}
                  </Link>
                )
              )}
            </div>
          </div>
        </section>

        {/* ── Sector browse ── */}
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="font-display text-xl font-semibold">
              Browse by sector
            </h2>
            <Link
              href="/jobs"
              className="flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-rust)]"
            >
              All sectors <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-px border border-[var(--color-line)] bg-[var(--color-line)] sm:grid-cols-3 lg:grid-cols-4">
            {topSectors.map((s) => (
              <Link
                key={s.id}
                href={`/jobs?sector=${s.slug}`}
                prefetch={false}
                className="bg-[var(--color-paper)] px-4 py-3.5 text-sm font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper-dim)] hover:text-[var(--color-rust)]"
              >
                {s.name}
              </Link>
            ))}
          </div>
        </section>

        {/* ── Recent jobs ── */}
        {recentJobs.length > 0 && (
          <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <div className="mb-6 flex items-end justify-between">
              <h2 className="font-display text-xl font-semibold">
                Recently posted
              </h2>
              <Link
                href="/jobs"
                className="flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-rust)]"
              >
                View all jobs <ArrowRight size={14} />
              </Link>
            </div>
            <div className="border-t border-[var(--color-line)]">
              {recentJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          </section>
        )}

        {/* ── Employer CTA ── */}
        <section className="border-t border-[var(--color-line)] bg-[var(--color-paper-dim)]">
          <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
            <h2 className="font-display text-2xl font-semibold">
              Hiring in South Africa?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[var(--color-muted)]">
              Post a vacancy and reach job seekers across every province, free.
            </p>
            <Link
              href="/employer/post"
              className="mt-7 inline-flex bg-[var(--color-rust)] px-7 py-3 text-sm font-medium text-[var(--color-paper)] hover:bg-[var(--color-rust-dark)]"
            >
              Post a job
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
