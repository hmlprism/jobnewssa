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
import { Link } from "@/lib/navigation";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [recentJobs, count, govtJobs, internJobs, learnerJobs, gradJobs, t] =
    await Promise.all([
      getCachedRecentJobs(),
      getCachedJobCount(),
      getCachedGovtJobs(),
      getCachedInternshipJobs(),
      getCachedLearnershipJobs(),
      getCachedGraduateJobs(),
      getTranslations("Home"),
    ]);

  const categoryPills = [
    { label: t("pills.government"),       href: "/jobs?sector=government-parastatals" },
    { label: t("pills.learnerships"),     href: "/jobs?q=learnership" },
    { label: t("pills.internships"),      href: "/jobs?contract=internship" },
    { label: t("pills.graduate"),         href: "/jobs?q=graduate+programme" },
    { label: t("pills.apprenticeships"),  href: "/jobs?q=apprenticeship" },
    { label: t("pills.bursaries"),        href: "/jobs?q=bursary" },
    { label: t("pills.partTime"),         href: "/jobs?contract=part_time" },
    { label: t("pills.remote"),           href: "/jobs?remote=true" },
  ];

  const categorySections = [
    { title: t("sections.govVacancies"),  viewAllHref: "/jobs?sector=government-parastatals", jobs: govtJobs },
    { title: t("sections.learnerships"),  viewAllHref: "/jobs?q=learnership",                  jobs: learnerJobs },
    { title: t("sections.internships"),   viewAllHref: "/jobs?contract=internship",             jobs: internJobs },
    { title: t("sections.gradProgrammes"),viewAllHref: "/jobs?q=graduate+programme",            jobs: gradJobs },
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
                {t("dateline")}
              </p>
            </div>

            {/* Two-column masthead: stat left, search right */}
            {/* ink-50 on the grid container fills the full row height; transparent left column
                lets it show through; right column explicitly covers with paper */}
            <div className="grid grid-cols-1 bg-[var(--color-ink-50)] md:grid-cols-[5fr_7fr]">

              {/* Left — the editorial statistic */}
              <div className="border-b border-[var(--color-line)] py-10 md:border-b-0 md:border-r md:py-16 md:pr-12">
                <h1 className="masthead-number font-display text-[76px] font-semibold leading-[0.88] text-[var(--color-ink)] sm:text-[92px] lg:text-[108px]">
                  {count.toLocaleString()}
                  <span className="sr-only">{t("hero.statSrOnly")}</span>
                </h1>
                <p className="mt-5 font-display text-xl font-normal leading-snug text-[var(--color-ink)]">
                  {t("hero.vacanciesListed")}
                </p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  {t("hero.acrossProvinces")}
                </p>
                <p className="mt-5 font-display text-base font-normal text-[var(--color-muted)]">
                  {t("hero.tagline")}
                </p>

                {/* Scanner illustration — broadsheet graphic below the stat.
                    Hidden on mobile (single-column stacks tall enough already).
                    overflow-hidden clips animated papers at SVG viewport edge
                    so they don't travel into the stat text above. */}
                <div className="mt-10 hidden md:block">
                  {/*
                    SVG coordinate space: 300 × 400.
                    Machine body: y 85–265 (180 px total).
                      Top bar (exit slot):   y  85–105, full width.
                      Bottom bar (entry):    y 248–265, full width.
                      Side panels: x 20–55 (left), x 245–280 (right).
                      Interior window (paper visible): x 55–245, y 105–248.
                    Paired pinch rollers (r=10) at each slot edge:
                      Exit  — cx 62 & 238, upper cy 98, lower cy 114.
                      Entry — cx 62 & 238, upper cy 240, lower cy 256.
                    Papers: x 74–226 (152 px wide), fits inside 190 px
                      interior with 19 px margin each side. Height 120 px.
                      Start y 268 (3 px below entry bar bottom at y 265).
                    Layer order: input-tray hint first, papers second,
                      machine parts on top — bars/panels occlude paper at
                      slot edges; rollers drawn after bars to protrude visibly.
                    overflow-hidden on the SVG clips papers at SVG viewport
                      boundary (y=0) so they disappear shortly above the
                      exit slot and do not drift into the stat text above.
                  */}
                  <svg
                    viewBox="0 0 300 400"
                    aria-hidden="true"
                    className="w-40 lg:w-44 h-auto overflow-hidden"
                  >
                    {/* Input tray: paper stack hint below entry slot (static) */}
                    <rect x="74" y="267"   width="152" height="2.5" fill="white" stroke="var(--color-line)" strokeWidth="0.75" opacity="0.9"/>
                    <rect x="76" y="270.5" width="152" height="2.5" fill="white" stroke="var(--color-line)" strokeWidth="0.75" opacity="0.65"/>
                    <rect x="78" y="274"   width="152" height="2.5" fill="white" stroke="var(--color-line)" strokeWidth="0.75" opacity="0.4"/>
                    {/* ── Paper 1 — delay 0, starts below machine ── */}
                    <g className="scanner-paper">
                      <rect x="74" y="268" width="152" height="120" fill="white" stroke="var(--color-line)" strokeWidth="0.75"/>
                      <rect x="80" y="277" width="128" height="3.5" fill="var(--color-ink)" opacity="0.22"/>
                      <rect x="80" y="288" width="95"  height="2" fill="var(--color-ink)" opacity="0.14"/>
                      <rect x="80" y="295" width="138" height="2" fill="var(--color-ink)" opacity="0.14"/>
                      <rect x="80" y="302" width="78"  height="2" fill="var(--color-ink)" opacity="0.14"/>
                      <rect x="80" y="309" width="115" height="2" fill="var(--color-ink)" opacity="0.14"/>
                      <rect x="80" y="320" width="108" height="2" fill="var(--color-ink)" opacity="0.14"/>
                      <rect x="80" y="327" width="88"  height="2" fill="var(--color-ink)" opacity="0.14"/>
                      <rect x="80" y="334" width="128" height="2" fill="var(--color-ink)" opacity="0.14"/>
                      <rect x="80" y="345" width="68"  height="2" fill="var(--color-ink)" opacity="0.14"/>
                      <rect x="80" y="352" width="118" height="2" fill="var(--color-ink)" opacity="0.14"/>
                      <rect x="80" y="359" width="85"  height="2" fill="var(--color-ink)" opacity="0.14"/>
                    </g>
                    {/* ── Paper 2 — delay -1s (≈ mid-transit, inside machine at load) ── */}
                    <g className="scanner-paper scanner-paper-2">
                      <rect x="74" y="268" width="152" height="120" fill="white" stroke="var(--color-line)" strokeWidth="0.75"/>
                      <rect x="80" y="277" width="118" height="3.5" fill="var(--color-ink)" opacity="0.22"/>
                      <rect x="80" y="288" width="80"  height="2" fill="var(--color-ink)" opacity="0.14"/>
                      <rect x="80" y="295" width="140" height="2" fill="var(--color-ink)" opacity="0.14"/>
                      <rect x="80" y="302" width="92"  height="2" fill="var(--color-ink)" opacity="0.14"/>
                      <rect x="80" y="309" width="104" height="2" fill="var(--color-ink)" opacity="0.14"/>
                      <rect x="80" y="320" width="122" height="2" fill="var(--color-ink)" opacity="0.14"/>
                      <rect x="80" y="327" width="64"  height="2" fill="var(--color-ink)" opacity="0.14"/>
                      <rect x="80" y="334" width="136" height="2" fill="var(--color-ink)" opacity="0.14"/>
                      <rect x="80" y="345" width="82"  height="2" fill="var(--color-ink)" opacity="0.14"/>
                      <rect x="80" y="352" width="100" height="2" fill="var(--color-ink)" opacity="0.14"/>
                      <rect x="80" y="359" width="132" height="2" fill="var(--color-ink)" opacity="0.14"/>
                    </g>
                    {/* ── Paper 3 — delay -2s (≈ exiting top at load) ── */}
                    <g className="scanner-paper scanner-paper-3">
                      <rect x="74" y="268" width="152" height="120" fill="white" stroke="var(--color-line)" strokeWidth="0.75"/>
                      <rect x="80" y="277" width="134" height="3.5" fill="var(--color-ink)" opacity="0.22"/>
                      <rect x="80" y="288" width="112" height="2" fill="var(--color-ink)" opacity="0.14"/>
                      <rect x="80" y="295" width="68"  height="2" fill="var(--color-ink)" opacity="0.14"/>
                      <rect x="80" y="302" width="130" height="2" fill="var(--color-ink)" opacity="0.14"/>
                      <rect x="80" y="309" width="88"  height="2" fill="var(--color-ink)" opacity="0.14"/>
                      <rect x="80" y="320" width="102" height="2" fill="var(--color-ink)" opacity="0.14"/>
                      <rect x="80" y="327" width="120" height="2" fill="var(--color-ink)" opacity="0.14"/>
                      <rect x="80" y="334" width="74"  height="2" fill="var(--color-ink)" opacity="0.14"/>
                      <rect x="80" y="345" width="116" height="2" fill="var(--color-ink)" opacity="0.14"/>
                      <rect x="80" y="352" width="90"  height="2" fill="var(--color-ink)" opacity="0.14"/>
                      <rect x="80" y="359" width="52"  height="2" fill="var(--color-ink)" opacity="0.14"/>
                    </g>
                    {/* ── Machine body — drawn above papers, occludes at slot edges ── */}
                    {/* Side panels */}
                    <rect x="20"  y="85" width="35"  height="180" fill="var(--color-ink-50)"   stroke="var(--color-line)" strokeWidth="1.5"/>
                    <rect x="245" y="85" width="35"  height="180" fill="var(--color-ink-50)"   stroke="var(--color-line)" strokeWidth="1.5"/>
                    {/* Top bar — covers paper as it exits */}
                    <rect x="20"  y="85"  width="260" height="20"  fill="var(--color-paper-dim)" stroke="var(--color-line)" strokeWidth="1.5"/>
                    {/* Bottom bar — covers paper as it enters */}
                    <rect x="20"  y="248" width="260" height="17"  fill="var(--color-paper-dim)" stroke="var(--color-line)" strokeWidth="1.5"/>
                    {/* Pinch rollers at exit slot */}
                    <circle cx="62"  cy="98"  r="10" fill="var(--color-paper-dim)" stroke="var(--color-line)" strokeWidth="1.25"/>
                    <circle cx="62"  cy="114" r="10" fill="var(--color-paper-dim)" stroke="var(--color-line)" strokeWidth="1.25"/>
                    <circle cx="238" cy="98"  r="10" fill="var(--color-paper-dim)" stroke="var(--color-line)" strokeWidth="1.25"/>
                    <circle cx="238" cy="114" r="10" fill="var(--color-paper-dim)" stroke="var(--color-line)" strokeWidth="1.25"/>
                    {/* Pinch rollers at entry slot */}
                    <circle cx="62"  cy="240" r="10" fill="var(--color-paper-dim)" stroke="var(--color-line)" strokeWidth="1.25"/>
                    <circle cx="62"  cy="256" r="10" fill="var(--color-paper-dim)" stroke="var(--color-line)" strokeWidth="1.25"/>
                    <circle cx="238" cy="240" r="10" fill="var(--color-paper-dim)" stroke="var(--color-line)" strokeWidth="1.25"/>
                    <circle cx="238" cy="256" r="10" fill="var(--color-paper-dim)" stroke="var(--color-line)" strokeWidth="1.25"/>
                    {/* Interior guide lines (dashed) */}
                    <line x1="60" y1="132" x2="240" y2="132" stroke="var(--color-line)" strokeWidth="0.75" strokeDasharray="4 3"/>
                    <line x1="60" y1="220" x2="240" y2="220" stroke="var(--color-line)" strokeWidth="0.75" strokeDasharray="4 3"/>
                    {/* Scan bar — static violet, papers pass behind it */}
                    <rect x="60" y="176" width="180" height="2.5" fill="var(--color-violet)" opacity="0.45"/>
                    {/* Status LED on left panel */}
                    <circle cx="37" cy="170" r="4" fill="var(--color-violet)" opacity="0.85"/>
                    {/* Panel score lines */}
                    <line x1="20"  y1="205" x2="55"  y2="205" stroke="var(--color-line)" strokeWidth="0.75"/>
                    <line x1="245" y1="205" x2="280" y2="205" stroke="var(--color-line)" strokeWidth="0.75"/>
                  </svg>
                </div>
              </div>

              {/* Right — search utility; paper bg covers the grid container's ink-50 */}
              <div className="bg-[var(--color-paper)] py-10 md:py-16 md:pl-12">
                <form action="/jobs" className="flex">
                  <label htmlFor="hero-q" className="sr-only">
                    {t("hero.searchInput")}
                  </label>
                  <input
                    id="hero-q"
                    type="text"
                    name="q"
                    placeholder={t("hero.searchInput")}
                    className="min-w-0 flex-1 border border-r-0 border-[var(--color-line)] bg-[var(--color-paper)] py-3.5 px-4 text-sm placeholder:text-[var(--color-muted)]"
                  />
                  <button
                    type="submit"
                    className="shrink-0 cursor-pointer bg-[var(--color-violet)] px-6 py-3.5 text-sm font-medium text-[var(--color-paper)] hover:bg-[var(--color-violet-dark)]"
                  >
                    {t("hero.searchButton")}
                  </button>
                </form>

                <div className="mt-4 flex flex-wrap gap-2">
                  {categoryPills.map((pill) => (
                    <Link
                      key={pill.href}
                      href={pill.href}
                      prefetch={false}
                      className="border border-[var(--color-line)] px-3 py-3.5 text-xs font-medium text-[var(--color-ink)] transition-colors duration-75 hover:border-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-[var(--color-paper)]"
                    >
                      {pill.label}
                    </Link>
                  ))}
                </div>

                {/* Province register — editorial index, fills dead space below pills */}
                <div className="mt-8 border-t border-[var(--color-line)] pt-5">
                  <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--color-amber)]">
                    {t("hero.browseByProvince")}
                  </p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                    {SA_PROVINCES.map((province) => (
                      <Link
                        key={province}
                        href={`/jobs?province=${slugify(province)}`}
                        prefetch={false}
                        className="py-3 text-sm text-[var(--color-muted)] transition-colors duration-100 hover:text-[var(--color-ink)]"
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
              label={t("sections.latestListings")}
              linkHref="/jobs"
              linkLabel={t("sections.vacanciesCount", { count: count.toLocaleString() })}
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
              linkLabel={t("sections.viewAll", { title: section.title })}
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
              {t("cta.heading")}
            </h2>
            <p className="mt-2 max-w-sm text-sm text-[var(--color-muted)]">
              {t("cta.body")}
            </p>
            <Link
              href="/employer/post"
              prefetch={false}
              className="mt-5 inline-block bg-[var(--color-rust)] px-6 py-3 text-sm font-medium text-[var(--color-paper)] hover:bg-[var(--color-rust-dark)]"
            >
              {t("cta.button")}
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
