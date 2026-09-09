import Link from "next/link";
import type { Job } from "@/types/database";
import { CONTRACT_TYPE_LABELS } from "@/types/database";
import { formatSalary, getDaysLeftNum, timeAgo } from "@/lib/utils";
import { MapPin, Clock, Wifi } from "lucide-react";
import { SaveButton } from "@/components/jobs/save-button";

export function JobCard({
  job,
  initialSaved = false,
}: {
  job: Job;
  initialSaved?: boolean;
}) {
  const daysNum = getDaysLeftNum(job.expires_at);
  const isExpired = daysNum !== null && daysNum < 0;
  const isClosingSoon = daysNum !== null && daysNum >= 0 && daysNum <= 3;
  const isUrgent = job.is_urgent ?? false;

  const closingSoonLabel =
    daysNum === 0 ? "Last day" : `${daysNum} day${daysNum === 1 ? "" : "s"} left`;

  const companyName =
    job.company?.name ?? job.company_name_raw ?? "Confidential company";
  const location = job.city || job.province || null;

  return (
    <article
      className={[
        "group relative block border-b border-[var(--color-line)] transition-colors duration-75",
        "hover:bg-[var(--color-paper-dim)] hover:border-b-[var(--color-line-hover)]",
        "before:absolute before:inset-y-0 before:left-0 before:w-[3px]",
        "before:bg-[var(--color-rust)] before:opacity-0 before:transition-opacity before:duration-75",
        "hover:before:opacity-75",
        isExpired ? "opacity-60" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Stretched link — covers the whole card below the content layer */}
      <Link
        href={`/jobs/${job.slug}`}
        prefetch={false}
        className="absolute inset-0 z-0"
        aria-label={job.title}
        tabIndex={-1}
      />

      <div className="relative z-10 pl-4 pr-3 py-4">
        {/* Top row: title + badge + save */}
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-[15px] font-semibold leading-snug group-hover:text-[var(--color-rust)]">
            <Link
              href={`/jobs/${job.slug}`}
              prefetch={false}
              className="focus-visible:outline-none focus-visible:underline"
            >
              {job.title}
            </Link>
          </h2>

          <div className="flex shrink-0 items-center gap-1.5">
            {/* Status / urgency badges */}
            {isExpired ? (
              <span className="border border-[var(--color-line)] bg-[var(--color-paper-dim)] px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
                Closed
              </span>
            ) : isClosingSoon ? (
              <span className="border border-[var(--color-ink-700)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-ink-700)]">
                {closingSoonLabel}
              </span>
            ) : daysNum !== null ? (
              <span className="whitespace-nowrap text-xs font-medium text-[var(--color-clay)]">
                {daysNum} day{daysNum === 1 ? "" : "s"} left
              </span>
            ) : null}

            {isUrgent && !isExpired && (
              <span className="border border-[var(--color-rust)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-rust)]">
                Urgent
              </span>
            )}

            <SaveButton jobId={job.id} initialSaved={initialSaved} />
          </div>
        </div>

        {/* Company + location row */}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-[var(--color-muted)]">
          <span className="font-medium text-[var(--color-ink)]/80">
            {companyName}
          </span>
          {location && (
            <span className="flex items-center gap-1">
              <MapPin size={12} />
              {location}
            </span>
          )}
          {job.is_remote && (
            <span className="flex items-center gap-1">
              <Wifi size={12} />
              Remote
            </span>
          )}
        </div>

        {/* Meta row */}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="border border-[var(--color-line)] px-2 py-0.5 text-[var(--color-ink)]">
            {CONTRACT_TYPE_LABELS[job.contract_type]}
          </span>
          <span className="text-[var(--color-ink)]/70">
            {formatSalary(
              job.salary_min,
              job.salary_max,
              job.salary_is_market_related
            )}
          </span>
          <span className="flex items-center gap-1 text-[var(--color-muted)]">
            <Clock size={11} />
            {timeAgo(job.posted_at)}
          </span>
          {job.source === "employer_direct" &&
            job.company &&
            (job.company.verified ? (
              <span className="border border-[var(--color-indigo)] bg-[var(--color-indigo-dim)] px-1.5 py-0.5 font-medium text-[var(--color-indigo)]">
                ✓ Verified
              </span>
            ) : (
              <span className="border border-[var(--color-line)] px-1.5 py-0.5 text-[var(--color-muted)]">
                Unverified employer
              </span>
            ))}
        </div>
      </div>
    </article>
  );
}
