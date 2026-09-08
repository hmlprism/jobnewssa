import { Suspense } from "react";
import { SiteHeader } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/footer";
import { getJobBySlug } from "@/lib/jobs-query";
import { CONTRACT_TYPE_LABELS } from "@/types/database";
import { formatSalary, daysLeft, timeAgo } from "@/lib/utils";
import { notFound } from "next/navigation";
import { LinkButton } from "@/components/ui/button";
import { ApplyPanelServer } from "@/components/jobs/apply-panel-server";
import Link from "next/link";
import { MapPin, Clock, Wifi, ArrowLeft } from "lucide-react";

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
  const job = await getJobBySlug(slug);
  if (!job) notFound();

  const companyName =
    job.company?.name ?? job.company_name_raw ?? "Confidential company";
  const left = daysLeft(job.expires_at);
  const location = job.city || job.province || null;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        {/* Back link */}
        <Link
          href="/jobs"
          prefetch={false}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-rust)]"
        >
          <ArrowLeft size={14} />
          Back to search
        </Link>

        {/* Job header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--color-muted)]">
            <span className="font-medium text-[var(--color-ink)]">
              {companyName}
            </span>
            {location && (
              <span className="flex items-center gap-1">
                <MapPin size={13} />
                {location}
              </span>
            )}
            {job.is_remote && (
              <span className="flex items-center gap-1">
                <Wifi size={13} />
                Remote
              </span>
            )}
            {job.source === "employer_direct" &&
              job.company &&
              (job.company.verified ? (
                <span className="border border-[var(--color-indigo)] bg-[var(--color-indigo-dim)] px-1.5 py-0.5 text-xs font-medium text-[var(--color-indigo)]">
                  ✓ Verified
                </span>
              ) : (
                <span className="border border-[var(--color-line)] px-1.5 py-0.5 text-xs text-[var(--color-muted)]">
                  Unverified employer
                </span>
              ))}
          </div>

          <h1 className="mt-2 font-display text-3xl font-semibold leading-tight sm:text-[2.25rem]">
            {job.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className="border border-[var(--color-line)] px-2.5 py-1">
              {CONTRACT_TYPE_LABELS[job.contract_type]}
            </span>
            <span className="font-medium">
              {formatSalary(
                job.salary_min,
                job.salary_max,
                job.salary_is_market_related
              )}
            </span>
            <span className="flex items-center gap-1 text-[var(--color-muted)]">
              <Clock size={13} />
              Posted {timeAgo(job.posted_at)}
            </span>
            {left && (
              <span
                className={
                  left === "Expired"
                    ? "text-[var(--color-muted)]"
                    : "font-medium text-[var(--color-clay)]"
                }
              >
                {left}
              </span>
            )}
          </div>
        </div>

        {/* Two-column: description + apply sidebar */}
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1fr_280px]">
          <article className="prose-job max-w-none border-t border-[var(--color-line)] pt-6 text-[15px] leading-relaxed whitespace-pre-line">
            {job.description}
          </article>

          <aside className="h-fit border border-[var(--color-line)] bg-[var(--color-paper)] p-5">
            {job.source === "adzuna" && job.external_url ? (
              <>
                <p className="mb-3 text-sm text-[var(--color-muted)]">
                  This listing is sourced from an external job feed. Apply on
                  the original site.
                </p>
                <LinkButton
                  href={job.external_url}
                  className="w-full justify-center"
                >
                  Apply on original site
                </LinkButton>
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
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
