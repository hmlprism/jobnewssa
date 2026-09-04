import { SiteHeader } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/footer";
import { JobCard } from "@/components/jobs/job-card";
import { getCachedRecentJobs, getCachedJobCount, getAllSectors } from "@/lib/jobs-query";
import Link from "next/link";
import { Search } from "lucide-react";

// SiteHeader reads cookies() on every request, making this page dynamic by
// nature. Declare it explicitly so Next.js doesn't attempt a build-time
// prerender (which would call the unstable_cache callbacks before env vars
// are available in the build environment).
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
      <section className="border-b border-[var(--color-line)]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="mb-4 text-sm text-[var(--color-muted)]">
            {count.toLocaleString()} vacancies live right now
          </p>
          <h1 className="max-w-2xl font-display text-4xl leading-[1.1] sm:text-5xl">
            Find real work, anywhere in South Africa.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-[var(--color-muted)]">
            Search vacancies across every province and sector — from
            Gauteng finance desks to Western Cape farms. No noise, no fake listings.
          </p>

          <form action="/jobs" className="mt-8 flex max-w-xl gap-2">
            <div className="relative flex-1">
              <Search
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
              />
              <input
                type="text"
                name="q"
                placeholder="Job title or keyword"
                className="w-full border border-[var(--color-line)] bg-[var(--color-paper)] py-3 pl-10 pr-4 text-sm"
              />
            </div>
            <button
              type="submit"
              className="cursor-pointer bg-[var(--color-ink)] px-6 py-3 text-sm font-medium text-[var(--color-paper)] hover:bg-[var(--color-ink)]/90"
            >
              Search jobs
            </button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="mb-6 font-display text-xl">Browse by sector</h2>
        <div className="grid grid-cols-2 gap-px border border-[var(--color-line)] bg-[var(--color-line)] sm:grid-cols-3 md:grid-cols-4">
          {topSectors.map((s) => (
            <Link
              key={s.id}
              href={`/jobs?sector=${s.slug}`}
              className="bg-[var(--color-paper)] px-4 py-4 text-sm font-medium hover:bg-[var(--color-paper-dim)] hover:text-[var(--color-rust)]"
            >
              {s.name}
            </Link>
          ))}
        </div>
      </section>

      {recentJobs.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-display text-xl">Recently posted</h2>
            <Link href="/jobs" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-rust)]">
              View all jobs →
            </Link>
          </div>
          <div className="border-t border-[var(--color-line)]">
            {recentJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </section>
      )}

      <section className="border-t border-[var(--color-line)] bg-[var(--color-paper-dim)]">
        <div className="mx-auto max-w-6xl px-4 py-14 text-center sm:px-6">
          <h2 className="font-display text-2xl">Hiring in South Africa?</h2>
          <p className="mx-auto mt-2 max-w-md text-[var(--color-muted)]">
            Post a vacancy and reach job seekers across every province, free.
          </p>
          <Link
            href="/employer/post"
            className="mt-6 inline-flex bg-[var(--color-rust)] px-6 py-3 text-sm font-medium text-[var(--color-paper)] hover:bg-[var(--color-rust-dark)]"
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
