"use client";

interface Props {
  summary: string;
  onChange: (val: string) => void;
}

export function StepSummary({ summary, onChange }: Props) {
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
          Professional summary
        </label>
        <textarea
          id="cv-summary"
          rows={7}
          className="w-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder-[var(--color-muted)] focus:border-[var(--color-ink)] focus:outline-none resize-y"
          placeholder="Qualified CA(SA) with seven years of experience in financial reporting and IFRS compliance…"
          value={summary}
          onChange={(e) => onChange(e.target.value)}
        />
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          {summary.length > 0
            ? `${summary.split(/\s+/).filter(Boolean).length} words`
            : "Aim for 60–100 words."}
        </p>
      </div>
    </div>
  );
}
