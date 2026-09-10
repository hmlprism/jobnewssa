import { Suspense } from "react";
import { SiteHeader } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/footer";
import { getJobBySlug } from "@/lib/jobs-query";
import { CONTRACT_TYPE_LABELS } from "@/types/database";
import { formatSalary, daysLeft, timeAgo } from "@/lib/utils";
import { notFound } from "next/navigation";
import { LinkButton } from "@/components/ui/button";
import { ApplyPanelServer } from "@/components/jobs/apply-panel-server";
import { SaveButton } from "@/components/jobs/save-button";
import { LogAppliedButton } from "@/components/jobs/log-applied-button";
import { getAuthUser } from "@/lib/supabase/server";
import Link from "next/link";
import type { Job } from "@/types/database";

// ── Flag derivation (mirrors job-card.tsx) ──────────────────────────────────
// Gives visual continuity from the listing card to the detail view.
const PROVINCE_ABBR: Record<string, string> = {
  "Gauteng": "GP", "Western Cape": "WC", "KwaZulu-Natal": "KZN",
  "Eastern Cape": "EC", "Free State": "FS", "Limpopo": "LP",
  "Mpumalanga": "MP", "North West": "NW", "Northern Cape": "NC",
};

function getFlag(job: Job): { code: string; colorClass: string } {
  const t = job.title.toLowerCase();
  if (t.includes("learnership")) return { code: "LSHP", colorClass: "text-[var(--color-amber)]" };
  if (t.includes("bursary"))     return { code: "BURS", colorClass: "text-[var(--color-amber)]" };
  if (t.includes("apprenticeship")) return { code: "APPR", colorClass: "text-[var(--color-amber)]" };
  if (job.contract_type === "internship" || t.includes("internship"))
    return { code: "INTN", colorClass: "text-[var(--color-green)]" };
  if (t.includes("graduate") && (t.includes("programme") || t.includes("program")))
    return { code: "GRAD", colorClass: "text-[var(--color-green)]" };
  if (job.sector?.slug?.includes("government"))
    return { code: "GOVT", colorClass: "text-[var(--color-indigo)]" };
  if (job.is_remote) return { code: "RM", colorClass: "text-[var(--color-muted)]" };
  const abbr = job.province ? PROVINCE_ABBR[job.province] : null;
  return { code: abbr ?? "—", colorClass: "text-[var(--color-muted)]" };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const job = await getJobBySlug(slug);
  if (!job) return { title: "Job not found" };
  return {
    title: `${job.title} — ${job.company?.name ?? job.company_name_raw}`,
    description: job.description.slice(0, 155),
  };
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [job, user] = await Promise.all([getJobBySlug(slug), getAuthUser()]);
  if (!job) notFound();

  const companyName =
    job.company?.name ?? job.company_name_raw ?? "Confidential company";
  const left = daysLeft(job.expires_at);
  const location = job.city || job.province || null;
  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_is_market_related);
  const flag = getFlag(job);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">

        {/* Back link */}
        <Link
          href="/jobs"
          prefetch={false}
          className="mb-8 inline-block text-sm text-[var(--color-muted)] hover:text-[var(--color-rust)]"
        >
          ← Back to search
        </Link>

        {/* Job header */}
        <div className="mb-6">
          {/* Flag code — mirrors the card treatment for visual continuity */}
          <p className={`mb-2 text-[9px] font-bold uppercase leading-none tracking-widest select-none ${flag.colorClass}`}>
            {flag.code}
          </p>

          {/* Company dateline */}
          <p className="text-sm text-[var(--color-muted)]">
            <span className="font-medium text-[var(--color-ink)]">{companyName}</span>
            {location && <span> · {location}</span>}
            {job.is_remote && <span> · Remote</span>}
            {job.source === "employer_direct" && job.company?.verified && (
              <span className="text-[var(--color-indigo)]"> · ✓ Verified</span>
            )}
          </p>

          {/* Title + Save */}
          <div className="mt-3 flex items-start justify-between gap-4">
            <h1 className="font-display text-3xl font-semibold leading-tight sm:text-[2.25rem]">
              {job.title}
            </h1>
            <SaveButton jobId={job.id} />
          </div>

          {/* Metadata row — plain text, no badges or icons */}
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            <span>{CONTRACT_TYPE_LABELS[job.contract_type]}</span>
            {salary !== "Market related" && <span> · {salary}</span>}
            <span> · Posted {timeAgo(job.posted_at)}</span>
            {left && left !== "Expired" && (
              <span className="font-medium text-[var(--color-clay)]"> · {left}</span>
            )}
            {left === "Expired" && <span> · Expired</span>}
          </p>
        </div>

        {/* Two-column: description + apply sidebar */}
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1fr_280px]">

          {/* Description */}
          <article className="prose-job max-w-none border-t border-[var(--color-line)] pt-6 text-[15px] leading-relaxed whitespace-pre-line">
            {job.description}
          </article>

          {/* Aside — top border aligns with article rule on desktop */}
          <aside className="border-t border-[var(--color-line)] pt-6">

            {/* Apply / external panel */}
            <div>
              {job.source === "adzuna" && job.external_url ? (
                <>
                  <p className="mb-3 text-sm text-[var(--color-muted)]">
                    This listing is from an external job feed. Apply on the
                    original site.
                  </p>
                  <LinkButton
                    href={job.external_url}
                    className="w-full justify-center"
                  >
                    Apply on original site
                  </LinkButton>
                  <div className="mt-5 border-t border-[var(--color-line)] pt-4">
                    <p className="mb-2 text-xs text-[var(--color-muted)]">
                      Already applied?
                    </p>
                    <LogAppliedButton
                      jobId={job.id}
                      userId={user?.id ?? null}
                      initialApplied={false}
                    />
                  </div>
                </>
              ) : (
                <Suspense
                  fallback={
                    <div className="h-24 animate-pulse bg-[var(--color-paper-dim)]" />
                  }
                >
                  <ApplyPanelServer jobId={job.id} />
                </Suspense>
              )}
            </div>

            {/* Application tips */}
            <div className="mt-6 border-t border-[var(--color-line)] pt-6">
              <h3 className="mb-3 text-xs font-semibold text-[var(--color-muted)]">
                Application tips
              </h3>
              <ul className="space-y-2.5 text-sm text-[var(--color-ink)]">
                <li className="flex gap-2">
                  <span className="mt-0.5 shrink-0 text-[var(--color-muted)]">—</span>
                  Tailor your CV to the job title and key requirements — SA
                  employers often screen by keyword.
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 shrink-0 text-[var(--color-muted)]">—</span>
                  Include your ID number or work-permit status if the ad
                  requests it; omitting it is a common rejection reason.
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 shrink-0 text-[var(--color-muted)]">—</span>
                  Keep your cover letter under one page and open with a
                  sentence on why this specific role, not a generic greeting.
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
