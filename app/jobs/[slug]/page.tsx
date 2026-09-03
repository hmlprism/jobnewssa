import { SiteHeader } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/footer";
import { getJobBySlug } from "@/lib/jobs-query";
import { CONTRACT_TYPE_LABELS } from "@/types/database";
import { formatSalary, daysLeft, timeAgo } from "@/lib/utils";
import { notFound } from "next/navigation";
import { LinkButton } from "@/components/ui/button";
import { ApplyPanel } from "@/components/jobs/apply-panel";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
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

  const companyName = job.company?.name ?? job.company_name_raw ?? "Confidential company";
  const left = daysLeft(job.expires_at);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="mb-6">
          <p className="text-sm text-[var(--color-muted)]">
            {companyName}
            {job.city ? ` · ${job.city}` : job.province ? ` · ${job.province}` : ""}
          </p>
          <h1 className="mt-1 font-display text-3xl">{job.title}</h1>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className="border border-[var(--color-line)] px-2 py-1">
              {CONTRACT_TYPE_LABELS[job.contract_type]}
            </span>
            <span className="font-medium">
              {formatSalary(job.salary_min, job.salary_max, job.salary_is_market_related)}
            </span>
            <span className="text-[var(--color-muted)]">Posted {timeAgo(job.posted_at)}</span>
            {left && (
              <span className={left === "Expired" ? "text-[var(--color-muted)]" : "font-medium text-[var(--color-rust)]"}>
                {left}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1fr_280px]">
          <article className="prose-job max-w-none border-t border-[var(--color-line)] pt-6 text-[15px] leading-relaxed whitespace-pre-line">
            {job.description}
          </article>

          <aside className="h-fit border border-[var(--color-line)] p-5">
            {job.source === "adzuna" && job.external_url ? (
              <>
                <p className="mb-3 text-sm text-[var(--color-muted)]">
                  This listing is sourced from an external job feed. Apply on the original site.
                </p>
                <LinkButton href={job.external_url} className="w-full justify-center">
                  Apply on original site
                </LinkButton>
              </>
            ) : (
              <ApplyPanel jobId={job.id} />
            )}
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
