"use client";

import { validateSummary, SUMMARY_MAX } from "@/lib/cv-validation";

interface Props {
  summary: string;
  attempted: boolean;
  onChange: (val: string) => void;
}

export function StepSummary({ summary, attempted, onChange }: Props) {
  const error = attempted ? validateSummary(summary) : null;
  const charCount = summary.length;
  const isOverLimit = charCount > SUMMARY_MAX;

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-muted)]">
        Write 3–5 sentences that summarise your experience, expertise, and what
        you are looking for. Employers read this first — keep it specific and
        direct.
      </p>
      <div>
        <label
          htmlFor="cv-summary"
          className="mb-1 block text-sm font-medium text-[var(--color-ink)]"
        >
          Professional summary{" "}
          <span className="text-[var(--color-rust)]">*</span>
        </label>
        <textarea
          id="cv-summary"
          rows={7}
          className={[
            "w-full border bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder-[var(--color-muted)] focus:outline-none resize-y",
            error || isOverLimit
              ? "border-[var(--color-rust)] focus:border-[var(--color-rust)]"
              : "border-[var(--color-line)] focus:border-[var(--color-ink)]",
          ].join(" ")}
          placeholder="Qualified CA(SA) with seven years of experience in financial reporting and IFRS compliance…"
          value={summary}
          onChange={(e) => onChange(e.target.value)}
        />
        <div className="mt-1 flex items-start justify-between gap-2">
          {error ? (
            <p className="text-xs text-[var(--color-rust)]">{error}</p>
          ) : (
            <span />
          )}
          <p
            className={[
              "shrink-0 text-xs",
              isOverLimit
                ? "text-[var(--color-rust)]"
                : "text-[var(--color-muted)]",
            ].join(" ")}
          >
            {charCount} / {SUMMARY_MAX}
          </p>
        </div>
      </div>
    </div>
  );
}
