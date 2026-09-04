import Link from "next/link";
import type { Job } from "@/types/database";
import { CONTRACT_TYPE_LABELS } from "@/types/database";
import { formatSalary, daysLeft, timeAgo } from "@/lib/utils";

export function JobCard({ job }: { job: Job }) {
  const left = daysLeft(job.expires_at);
  const companyName = job.company?.name ?? job.company_name_raw ?? "Confidential company";

  return (
    <Link
      href={`/jobs/${job.slug}`}
      className="group relative block border-b border-[var(--color-line)] px-1 py-5 transition-colors duration-100 hover:bg-[var(--color-paper-dim)] hover:border-[var(--color-line-hover)] before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-[var(--color-rust)] before:opacity-0 before:transition-opacity before:duration-75 hover:before:opacity-100"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold leading-snug group-hover:text-[var(--color-rust)]">
            {job.title}
          </h2>
          <p className="mt-0.5 text-sm text-[var(--color-muted)]">
            {companyName}
            {job.city ? ` · ${job.city}` : job.province ? ` · ${job.province}` : ""}
            {job.is_remote ? " · Remote" : ""}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-muted)]">
            <span className="border border-[var(--color-line)] px-2 py-0.5">
              {CONTRACT_TYPE_LABELS[job.contract_type]}
            </span>
            <span>{formatSalary(job.salary_min, job.salary_max, job.salary_is_market_related)}</span>
            <span>Posted {timeAgo(job.posted_at)}</span>
            {job.source === "employer_direct" && job.company && (
              job.company.verified ? (
                <span className="border border-[var(--color-indigo)] bg-[var(--color-indigo-dim)] px-1.5 py-0.5 font-medium text-[var(--color-indigo)]">
                  ✓ Verified
                </span>
              ) : (
                <span className="border border-[var(--color-line)] px-1.5 py-0.5 text-[var(--color-muted)]">
                  Unverified employer
                </span>
              )
            )}
          </div>
        </div>

        {left && (
          <span
            className={`shrink-0 whitespace-nowrap text-xs font-medium ${
              left === "Expired" ? "text-[var(--color-muted)]" : "text-[var(--color-rust)]"
            }`}
          >
            {left}
          </span>
        )}
      </div>
    </Link>
  );
}
