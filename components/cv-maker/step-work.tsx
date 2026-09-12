"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CvWorkEntry } from "@/types/cv";
import { validateWorkEntry } from "@/lib/cv-validation";

interface Props {
  entries: CvWorkEntry[];
  attempted: boolean;
  onChange: (entries: CvWorkEntry[]) => void;
}

// ---------------------------------------------------------------------------
// Month-Year picker — two selects that emit "Mon YYYY" strings
// ---------------------------------------------------------------------------

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const START_YEAR = 2026;
const YEARS: number[] = [];
for (let y = START_YEAR; y >= 1950; y--) YEARS.push(y);

function parseDateStr(val: string | null | undefined): { month: string; year: string } {
  if (!val?.trim()) return { month: "", year: "" };
  const parts = val.trim().split(" ");
  return { month: parts[0] ?? "", year: parts[1] ?? "" };
}

function MonthYearPicker({
  value,
  onChange,
  disabled = false,
  hasError = false,
}: {
  value: string | null;
  onChange: (val: string) => void;
  disabled?: boolean;
  hasError?: boolean;
}) {
  const { month, year } = parseDateStr(value);
  const borderCls = hasError
    ? "border-[var(--color-rust)] focus:border-[var(--color-rust)]"
    : "border-[var(--color-line)] focus:border-[var(--color-ink)]";
  const cls = `border bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)] focus:outline-none disabled:opacity-50 ${borderCls}`;

  const emit = (m: string, y: string) => {
    onChange(m && y ? `${m} ${y}` : "");
  };

  return (
    <div className="flex gap-2">
      <select
        className={`flex-1 ${cls}`}
        value={month}
        disabled={disabled}
        onChange={(e) => emit(e.target.value, year)}
      >
        <option value="">Month</option>
        {MONTHS.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <select
        className={`w-28 ${cls}`}
        value={year}
        disabled={disabled}
        onChange={(e) => emit(month, e.target.value)}
      >
        <option value="">Year</option>
        {YEARS.map((y) => (
          <option key={y} value={String(y)}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field helpers
// ---------------------------------------------------------------------------

const inputOk =
  "w-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder-[var(--color-muted)] focus:border-[var(--color-ink)] focus:outline-none";
const inputErr =
  "w-full border border-[var(--color-rust)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder-[var(--color-muted)] focus:border-[var(--color-rust)] focus:outline-none";

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-[var(--color-rust)]">{msg}</p>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const EMPTY_ENTRY: CvWorkEntry = {
  employer: "",
  title: "",
  start: "",
  end: null,
  current: false,
  bullets: ["", "", ""],
};

export function StepWork({ entries, attempted, onChange }: Props) {
  const update = (i: number, patch: Partial<CvWorkEntry>) => {
    onChange(entries.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  };

  const setBullet = (entryIdx: number, bulletIdx: number, val: string) => {
    const bullets = [...entries[entryIdx].bullets];
    bullets[bulletIdx] = val;
    update(entryIdx, { bullets });
  };

  const remove = (i: number) => onChange(entries.filter((_, idx) => idx !== i));
  const add = () => onChange([...entries, { ...EMPTY_ENTRY, bullets: ["", "", ""] }]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--color-muted)]">
        List your jobs from most recent to oldest. You can skip this section if
        you are a new graduate or do not have formal work experience.
      </p>

      {entries.length === 0 && (
        <p className="border border-[var(--color-line)] p-5 text-center text-sm text-[var(--color-muted)]">
          No work experience added yet.
        </p>
      )}

      {entries.map((entry, i) => {
        const errs = attempted ? validateWorkEntry(entry) : {};

        return (
          <div key={i} className="border border-[var(--color-line)] p-5 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-medium text-sm text-[var(--color-ink)]">
                Position {i + 1}
              </h3>
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors"
                aria-label="Remove this position"
              >
                <Trash2 size={15} />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--color-ink)]">
                  Job title
                </label>
                <input
                  type="text"
                  className={errs.title ? inputErr : inputOk}
                  placeholder="Senior Financial Analyst"
                  value={entry.title}
                  onChange={(e) => update(i, { title: e.target.value })}
                />
                <FieldError msg={errs.title} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--color-ink)]">
                  Employer
                </label>
                <input
                  type="text"
                  className={errs.employer ? inputErr : inputOk}
                  placeholder="First National Bank"
                  value={entry.employer}
                  onChange={(e) => update(i, { employer: e.target.value })}
                />
                <FieldError msg={errs.employer} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--color-ink)]">
                  Start date
                </label>
                <MonthYearPicker
                  value={entry.start}
                  onChange={(v) => update(i, { start: v })}
                  hasError={!!errs.start}
                />
                <FieldError msg={errs.start} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--color-ink)]">
                  End date
                </label>
                <MonthYearPicker
                  value={entry.end}
                  onChange={(v) => update(i, { end: v || null })}
                  disabled={entry.current}
                  hasError={!!errs.end}
                />
                <FieldError msg={errs.end} />
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={entry.current}
                onChange={(e) =>
                  update(i, { current: e.target.checked, end: null })
                }
              />
              <span className="text-sm text-[var(--color-ink)]">
                This is my current position
              </span>
            </label>

            <div className="space-y-2">
              <p className="text-sm font-medium text-[var(--color-ink)]">
                Responsibilities / achievements
                <span className="ml-1 font-normal text-[var(--color-muted)]">
                  (up to 4 bullet points)
                </span>
              </p>
              {[0, 1, 2, 3].map((j) => {
                const bulletErr = errs.bullets?.[j];
                return (
                  <div key={j}>
                    <input
                      type="text"
                      className={bulletErr ? inputErr : inputOk}
                      placeholder={
                        j === 0
                          ? "Led monthly consolidation of R4.2bn balance sheet…"
                          : j === 1
                          ? "Reduced reporting cycle from 8 to 5 days…"
                          : ""
                      }
                      value={entry.bullets[j] ?? ""}
                      onChange={(e) => setBullet(i, j, e.target.value)}
                    />
                    <FieldError msg={bulletErr} />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {entries.length < 6 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={add}
          className="gap-1.5"
        >
          <Plus size={14} />
          Add position
        </Button>
      )}
    </div>
  );
}
