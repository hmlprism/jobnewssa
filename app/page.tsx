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
import { SA_PROVINCES } from "@/types/database";
import { slugify } from "@/lib/slug";
import Link from "next/link";

export const dynamic = "force-dynamic";

const CATEGORY_PILLS = [
  { label: "Government",         href: "/jobs?sector=government-parastatals" },
  { label: "Learnerships",       href: "/jobs?q=learnership" },
  { label: "Internships",        href: "/jobs?contract=internship" },
  { label: "Graduate",           href: "/jobs?q=graduate+programme" },
  { label: "Apprenticeships",    href: "/jobs?q=apprenticeship" },
  { label: "Bursaries",          href: "/jobs?q=bursary" },
  { label: "Part-Time",          href: "/jobs?contract=part_time" },
  { label: "Remote",             href: "/jobs?remote=true" },
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
    { title: "Government vacancies",  viewAllHref: "/jobs?sector=government-parastatals", jobs: govtJobs },
    { title: "Learnerships",          viewAllHref: "/jobs?q=learnership",                  jobs: learnerJobs },
    { title: "Internships",           viewAllHref: "/jobs?contract=internship",             jobs: internJobs },
    { title: "Graduate programmes",   viewAllHref: "/jobs?q=graduate+programme",            jobs: gradJobs },
  ].filter((s) => s.jobs.length > 0);

  return (
    <>
      <SiteHeader />

      <main>
        {/* ── Masthead hero ── */}
        <section className="border-b border-[var(--color-line)]">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">

            {/* Dateline strip */}
            <div className="border-b border-[var(--color-line)] py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--color-muted)] select-none">
                South Africa Employment Listings
              </p>
            </div>

            {/* Two-column masthead: stat left, search right */}
            <div className="grid grid-cols-1 md:grid-cols-[5fr_7fr]">

              {/* Left — the editorial statistic; ink-50 tint zones it from the search column */}
              <div className="border-b border-[var(--color-line)] bg-[var(--color-ink-50)] py-10 md:border-b-0 md:border-r md:py-16 md:pr-12">
                <h1 className="masthead-number font-display text-[76px] font-semibold leading-[0.88] text-[var(--color-ink)] sm:text-[92px] lg:text-[108px]">
                  {count.toLocaleString()}
                  <span className="sr-only"> job vacancies in South Africa</span>
                </h1>
                <p className="mt-5 font-display text-xl font-normal leading-snug text-[var(--color-ink)]">
                  vacancies listed
                </p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  across all nine provinces
                </p>
              </div>

              {/* Right — search utility */}
              <div className="py-10 md:py-16 md:pl-12">
                <form action="/jobs" className="flex">
                  <input
                    type="text"
                    name="q"
                    placeholder="Job title, keyword, or company"
                    className="min-w-0 flex-1 border border-r-0 border-[var(--color-line)] bg-[var(--color-paper)] py-3.5 px-4 text-sm placeholder:text-[var(--color-muted)]"
                  />
                  <button
                    type="submit"
                    className="shrink-0 cursor-pointer bg-[var(--color-rust)] px-6 py-3.5 text-sm font-medium text-[var(--color-paper)] hover:bg-[var(--color-rust-dark)]"
                  >
                    Search
                  </button>
                </form>

                <div className="mt-4 flex flex-wrap gap-2">
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

                {/* Province register — editorial index, fills dead space below pills */}
                <div className="mt-8 border-t border-[var(--color-line)] pt-5">
                  <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--color-amber)]">
                    Browse by province
                  </p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                    {SA_PROVINCES.map((province) => (
                      <Link
                        key={province}
                        href={`/jobs?province=${slugify(province)}`}
                        prefetch={false}
                        className="text-sm text-[var(--color-muted)] transition-colors duration-100 hover:text-[var(--color-ink)]"
                      >
                        {province}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Latest listings ── */}
        {recentJobs.length > 0 && (
          <section className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionRule
              label="Latest listings"
              linkHref="/jobs"
              linkLabel={`${count.toLocaleString()} vacancies`}
            />
            <div className="border-t border-[var(--color-line)]">
              {recentJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          </section>
        )}

        {/* ── Category sections ── */}
        {categorySections.map((section) => (
          <section
            key={section.title}
            className="mx-auto max-w-6xl border-t border-[var(--color-line)] px-4 sm:px-6"
          >
            <SectionRule
              label={section.title}
              linkHref={section.viewAllHref}
              linkLabel={`All ${section.title}`}
            />
            <div className="border-t border-[var(--color-line)]">
              {section.jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          </section>
        ))}

        {/* ── Employer CTA ── */}
        <section className="border-t border-[var(--color-line)] bg-[var(--color-paper-dim)]">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 className="text-base font-semibold text-[var(--color-ink)]">
              Hiring in South Africa?
            </h2>
            <p className="mt-2 max-w-sm text-sm text-[var(--color-muted)]">
              Post a vacancy and reach job seekers across every province, free.
            </p>
            <Link
              href="/employer/post"
              prefetch={false}
              className="mt-5 inline-block bg-[var(--color-rust)] px-6 py-3 text-sm font-medium text-[var(--color-paper)] hover:bg-[var(--color-rust-dark)]"
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

// ── Section rule divider ─────────────────────────────────────────────────────
// Inline label + hairline + right-aligned link.
// Replaces the old h2 + "View all →" pattern.
// Label is an h2 for document structure; styled as small sans, not display.
function SectionRule({
  label,
  linkHref,
  linkLabel,
}: {
  label: string;
  linkHref: string;
  linkLabel: string;
}) {
  return (
    <div className="flex items-center gap-4 py-8">
      <h2 className="whitespace-nowrap text-sm font-semibold text-[var(--color-ink)]">
        {label}
      </h2>
      <div className="flex-1 border-t border-[var(--color-line)]" />
      <Link
        href={linkHref}
        prefetch={false}
        className="whitespace-nowrap text-xs text-[var(--color-muted)] hover:text-[var(--color-rust)]"
      >
        {linkLabel}
      </Link>
    </div>
  );
}
