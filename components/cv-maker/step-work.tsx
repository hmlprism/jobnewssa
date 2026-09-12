"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CvWorkEntry } from "@/types/cv";

interface Props {
  entries: CvWorkEntry[];
  onChange: (entries: CvWorkEntry[]) => void;
}

const EMPTY_ENTRY: CvWorkEntry = {
  employer: "",
  title: "",
  start: "",
  end: null,
  current: false,
  bullets: ["", "", ""],
};

const input =
  "w-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder-[var(--color-muted)] focus:border-[var(--color-ink)] focus:outline-none";

export function StepWork({ entries, onChange }: Props) {
  const update = (i: number, patch: Partial<CvWorkEntry>) => {
    const next = entries.map((e, idx) => (idx === i ? { ...e, ...patch } : e));
    onChange(next);
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

      {entries.map((entry, i) => (
        <div
          key={i}
          className="border border-[var(--color-line)] p-5 space-y-4"
        >
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
                className={input}
                placeholder="Senior Financial Analyst"
                value={entry.title}
                onChange={(e) => update(i, { title: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-ink)]">
                Employer
              </label>
              <input
                type="text"
                className={input}
                placeholder="First National Bank"
                value={entry.employer}
                onChange={(e) => update(i, { employer: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-ink)]">
                Start date
              </label>
              <input
                type="text"
                className={input}
                placeholder="Mar 2021"
                value={entry.start}
                onChange={(e) => update(i, { start: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-ink)]">
                End date
              </label>
              <input
                type="text"
                className={input}
                placeholder="Feb 2024"
                disabled={entry.current}
                value={entry.current ? "" : (entry.end ?? "")}
                onChange={(e) => update(i, { end: e.target.value })}
              />
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
            {[0, 1, 2, 3].map((j) => (
              <input
                key={j}
                type="text"
                className={input}
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
            ))}
          </div>
        </div>
      ))}

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
