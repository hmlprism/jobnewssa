import { SiteHeader } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/footer";
import { JobCard } from "@/components/jobs/job-card";
import {
  getCachedRecentJobs,
  getCachedJobCount,
  getCachedGovtJobs,
  getCachedInternshipJobs,
  getCachedLearnershipJobs,
  getCachedGraduateJobs,
} from "@/lib/jobs-query";

import Link from "next/link";
import { Search, MapPin, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

// Category pills — outline at rest, filled ink on hover/active.
// Rust is NOT used here (reserved for primary CTAs only).
const CATEGORY_PILLS = [
  { label: "Government Vacancies", href: "/jobs?sector=government-parastatals" },
  { label: "Learnerships",         href: "/jobs?q=learnership" },
  { label: "Internships",          href: "/jobs?contract=internship" },
  { label: "Graduate Programmes",  href: "/jobs?q=graduate+programme" },
  { label: "Apprenticeships",      href: "/jobs?q=apprenticeship" },
  { label: "Bursaries",            href: "/jobs?q=bursary" },
  { label: "Part-Time",            href: "/jobs?contract=part_time" },
  { label: "Remote",               href: "/jobs?remote=true" },
] as const;

export default async function Home() {
  const [recentJobs, count, govtJobs, internJobs, learnerJobs, gradJobs] =
    await Promise.all([
      getCachedRecentJobs(),
      getCachedJobCount(),
      getCachedGovtJobs(),
      getCachedInternshipJobs(),
      getCachedLearnershipJobs(),
      getCachedGraduateJobs(),
    ]);

  const categorySections = [
    { title: "Government Vacancies", viewAllHref: "/jobs?sector=government-parastatals", jobs: govtJobs },
    { title: "Learnerships",         viewAllHref: "/jobs?q=learnership",                  jobs: learnerJobs },
    { title: "Internships",          viewAllHref: "/jobs?contract=internship",             jobs: internJobs },
    { title: "Graduate Programmes",  viewAllHref: "/jobs?q=graduate+programme",            jobs: gradJobs },
  ].filter((s) => s.jobs.length > 0);

  return (
    <>
      <SiteHeader />

      <main>
        {/* ── Hero ── */}
        <section className="texture-paper border-b border-[var(--color-line)] bg-[var(--color-paper)]">
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

            {/* Two-field search bar */}
            <form action="/jobs" className="mt-10 flex max-w-2xl">
              {/* Keyword field */}
              <div className="relative flex-1">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
                />
                <input
                  type="text"
                  name="q"
                  placeholder="Job title, keyword or company"
                  className="search-input w-full border border-r-0 border-[var(--color-line)] bg-[var(--color-paper)] py-3.5 pl-10 pr-3 text-sm placeholder:text-[var(--color-muted)]"
                />
              </div>
              {/* Location field */}
              <div className="relative w-52 shrink-0">
                <MapPin
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
                />
                <input
                  type="text"
                  name="location"
                  placeholder="City or province"
                  className="search-input w-full border border-r-0 border-[var(--color-line)] bg-[var(--color-paper)] py-3.5 pl-8 pr-3 text-sm placeholder:text-[var(--color-muted)]"
                />
              </div>
              <button
                type="submit"
                className="cursor-pointer bg-[var(--color-rust)] px-7 py-3.5 text-sm font-medium text-[var(--color-paper)] hover:bg-[var(--color-rust-dark)]"
              >
                Search
              </button>
            </form>

            {/* Category pills */}
            <div className="mt-6 flex flex-wrap gap-2">
              {CATEGORY_PILLS.map((pill) => (
                <Link
                  key={pill.label}
                  href={pill.href}
                  prefetch={false}
                  className="border border-[var(--color-line)] px-3 py-1.5 text-xs font-medium text-[var(--color-ink)] transition-colors duration-75 hover:border-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-[var(--color-paper)]"
                >
                  {pill.label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── Recently posted ── */}
        {recentJobs.length > 0 && (
          <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <div className="mb-6 flex items-end justify-between">
              <h2 className="font-display text-xl font-semibold">
                Recently posted
              </h2>
              <Link
                href="/jobs"
                prefetch={false}
                className="flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-rust)]"
              >
                View all jobs <ArrowRight size={14} />
              </Link>
            </div>
            <div className="border-t border-[var(--color-line)]">
              {recentJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Category sections ── */}
        {categorySections.map((section) => (
          <section
            key={section.title}
            className="border-t border-[var(--color-line)] mx-auto max-w-6xl px-4 py-14 sm:px-6"
          >
            <div className="mb-6 flex items-end justify-between">
              <h2 className="font-display text-xl font-semibold">
                {section.title}
              </h2>
              <Link
                href={section.viewAllHref}
                prefetch={false}
                className="flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-rust)]"
              >
                View all <ArrowRight size={14} />
              </Link>
            </div>
            <div className="border-t border-[var(--color-line)]">
              {section.jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                />
              ))}
            </div>
          </section>
        ))}

        {/* ── Sector browse ── */}
        {/* Removed: replaced by category pills in hero. Sector grid remains available at /jobs. */}

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
              prefetch={false}
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
