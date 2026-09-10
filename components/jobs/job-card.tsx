import Link from "next/link";
import type { Job } from "@/types/database";
import { CONTRACT_TYPE_LABELS } from "@/types/database";
import { formatSalary, getDaysLeftNum, timeAgo } from "@/lib/utils";
import { SaveButton } from "@/components/jobs/save-button";

// ── Flag derivation ──────────────────────────────────────────────────────────
// Each job gets a 2–4 character code in the left flag column.
// Special opportunity types (LSHP, BURS, INTN, GRAD, APPR) are colour-coded.
// Regular jobs fall back to a 2-letter province abbreviation — encodes real
// geographic information rather than decorating with a category label.
const PROVINCE_ABBR: Record<string, string> = {
  "Gauteng": "GP",
  "Western Cape": "WC",
  "KwaZulu-Natal": "KZN",
  "Eastern Cape": "EC",
  "Free State": "FS",
  "Limpopo": "LP",
  "Mpumalanga": "MP",
  "North West": "NW",
  "Northern Cape": "NC",
};

function getFlag(job: Job): { code: string; colorClass: string } {
  const t = job.title.toLowerCase();
  if (t.includes("learnership"))
    return { code: "LSHP", colorClass: "text-[var(--color-amber)]" };
  if (t.includes("bursary"))
    return { code: "BURS", colorClass: "text-[var(--color-amber)]" };
  if (t.includes("apprenticeship"))
    return { code: "APPR", colorClass: "text-[var(--color-amber)]" };
  if (job.contract_type === "internship" || t.includes("internship"))
    return { code: "INTN", colorClass: "text-[var(--color-green)]" };
  if (t.includes("graduate") && (t.includes("programme") || t.includes("program")))
    return { code: "GRAD", colorClass: "text-[var(--color-green)]" };
  if (job.sector?.slug?.includes("government"))
    return { code: "GOVT", colorClass: "text-[var(--color-indigo)]" };
  // Province abbreviation for all other jobs
  if (job.is_remote)
    return { code: "RM", colorClass: "text-[var(--color-muted)]" };
  const abbr = job.province ? PROVINCE_ABBR[job.province] : null;
  return { code: abbr ?? "—", colorClass: "text-[var(--color-muted)]" };
}

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
  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_is_market_related);

  const flag = getFlag(job);

  return (
    <article
      className={[
        "group relative flex border-b border-[var(--color-line)]",
        "transition-colors duration-75 hover:bg-[var(--color-paper-dim)]",
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

      {/* Flag column — type or province code */}
      <div className="relative z-10 flex w-11 shrink-0 flex-col items-end justify-start py-4 pr-2.5">
        <span
          className={`text-[9px] font-bold uppercase leading-none tracking-widest select-none ${flag.colorClass}`}
          title={flag.code}
        >
          {flag.code}
        </span>
      </div>

      {/* Vertical hairline — transitions to rust on card hover */}
      <div className="relative z-10 my-3.5 w-px shrink-0 self-stretch bg-[var(--color-line)] transition-colors duration-150 group-hover:bg-[var(--color-rust)] group-hover:opacity-50" />

      {/* Content */}
      <div className="relative z-10 min-w-0 flex-1 py-3.5 pl-4 pr-3">
        {/* Title row */}
        <div className="flex items-start gap-3">
          <h2 className="min-w-0 flex-1 text-[15px] font-semibold leading-snug group-hover:text-[var(--color-rust)]">
            <Link
              href={`/jobs/${job.slug}`}
              prefetch={false}
              className="focus-visible:outline-none focus-visible:underline"
            >
              {job.title}
            </Link>
          </h2>

          <div className="flex shrink-0 items-center gap-2 pt-0.5">
            {isExpired ? (
              <span className="text-[11px] text-[var(--color-muted)]">Closed</span>
            ) : isClosingSoon ? (
              <span className="text-[11px] font-medium text-[var(--color-rust)]">
                {closingSoonLabel}
              </span>
            ) : isUrgent ? (
              <span className="text-[11px] font-medium text-[var(--color-rust)]">Urgent</span>
            ) : null}
            <SaveButton jobId={job.id} initialSaved={initialSaved} />
          </div>
        </div>

        {/* Company · location · time */}
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          <span className="font-medium text-[var(--color-ink)]/80">{companyName}</span>
          {location && <span> · {location}</span>}
          {job.is_remote && !location && <span> · Remote</span>}
          <span> · {timeAgo(job.posted_at)}</span>
        </p>

        {/* Contract type · salary */}
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          {CONTRACT_TYPE_LABELS[job.contract_type]}
          {salary !== "Market related" && <span> · {salary}</span>}
          {!isExpired && daysNum !== null && daysNum > 3 && (
            <span> · {daysNum} days left</span>
          )}
        </p>

        {/* Verified employer — plain text, no badge box */}
        {job.source === "employer_direct" && job.company?.verified && (
          <p className="mt-1 text-[11px] text-[var(--color-indigo)]">
            ✓ Verified employer
          </p>
        )}
      </div>
    </article>
  );
}
