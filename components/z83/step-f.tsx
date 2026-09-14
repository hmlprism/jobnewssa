"use client";

import type { Z83WorkEntry, Z83Reference } from "@/types/z83";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  sectionF: Z83WorkEntry[];
  sectionG: Z83Reference[];
  attempted: boolean;
  onSectionFChange: (f: Z83WorkEntry[]) => void;
  onSectionGChange: (g: Z83Reference[]) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_WORK: Z83WorkEntry = {
  employer: "",
  post: "",
  from_month: "",
  from_year: "",
  to_month: "",
  to_year: "",
  reason: "",
};

const EMPTY_REF: Z83Reference = { name: "", relationship: "", tel: "" };

const MONTHS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

// ─── Validation helpers ───────────────────────────────────────────────────────

// Empty is always OK — validation only fires on non-empty values.
const validText = (v: string) =>
  v === "" || (v.trim().length >= 3 && /[a-zA-Z]/.test(v));

const validYear = (v: string) => {
  if (v === "") return true;
  const y = parseInt(v, 10);
  return /^\d{4}$/.test(v) && y >= 1950 && y <= 2026;
};

const validTel = (v: string) =>
  v === "" || v.replace(/\D/g, "").length >= 9;

// ─── Shared style helpers ─────────────────────────────────────────────────────

const inputOk =
  "w-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder-[var(--color-muted)] focus:border-[var(--color-ink)] focus:outline-none";
const inputErr =
  "w-full border border-[var(--color-rust)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder-[var(--color-muted)] focus:border-[var(--color-rust)] focus:outline-none";
const selectOk =
  "w-full border border-[var(--color-line)] bg-[var(--color-paper)] px-2 py-1.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-ink)] focus:outline-none";

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-[var(--color-rust)]">{msg}</p>;
}

// ─── Step F ───────────────────────────────────────────────────────────────────

export function StepF({
  sectionF,
  sectionG,
  attempted,
  onSectionFChange,
  onSectionGChange,
}: Props) {
  // Work entry helpers
  const addWork = () => {
    if (sectionF.length < 3) onSectionFChange([...sectionF, { ...EMPTY_WORK }]);
  };
  const updateWork = (i: number, patch: Partial<Z83WorkEntry>) =>
    onSectionFChange(sectionF.map((w, idx) => (idx === i ? { ...w, ...patch } : w)));
  const removeWork = (i: number) =>
    onSectionFChange(sectionF.filter((_, idx) => idx !== i));

  // Reference helpers
  const addRef = () => {
    if (sectionG.length < 3) onSectionGChange([...sectionG, { ...EMPTY_REF }]);
  };
  const updateRef = (i: number, patch: Partial<Z83Reference>) =>
    onSectionGChange(sectionG.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const removeRef = (i: number) =>
    onSectionGChange(sectionG.filter((_, idx) => idx !== i));

  // Per-row errors — only computed after first failed Next attempt
  const workErrs = attempted
    ? sectionF.map((w) => ({
        employer: !validText(w.employer)
          ? "At least 3 characters and must include a letter"
          : undefined,
        post: !validText(w.post)
          ? "At least 3 characters and must include a letter"
          : undefined,
        from_year: !validYear(w.from_year)
          ? "Enter a 4-digit year between 1950 and 2026"
          : undefined,
        to_year: !validYear(w.to_year)
          ? "Enter a 4-digit year between 1950 and 2026"
          : undefined,
      }))
    : sectionF.map(() => ({} as Record<string, undefined>));

  const refErrs = attempted
    ? sectionG.map((r) => ({
        name: !validText(r.name)
          ? "At least 3 characters and must include a letter"
          : undefined,
        tel: !validTel(r.tel)
          ? "Enter a valid phone number (at least 9 digits)"
          : undefined,
      }))
    : sectionG.map(() => ({} as Record<string, undefined>));

  return (
    <div className="space-y-10">
      {/* ── Work experience ───────────────────────────────────────────── */}
      <section>
        <h2 className="mb-1 text-base font-semibold text-[var(--color-ink)]">
          Work experience
        </h2>
        <p className="mb-5 text-sm text-[var(--color-muted)]">
          Up to 3 entries. List most recent first. Leave the To fields blank for
          your current position.
        </p>

        <div className="space-y-4">
          {sectionF.map((work, i) => {
            const e = workErrs[i];
            const isCurrent = !work.to_month && !work.to_year;
            return (
              <div key={i} className="border border-[var(--color-line)] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
                    Position {i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeWork(i)}
                    className="text-xs text-[var(--color-muted)] hover:text-[var(--color-rust)] transition-colors"
                  >
                    Remove
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
                      Employer
                    </label>
                    <input
                      type="text"
                      className={e.employer ? inputErr : inputOk}
                      placeholder="Department of Health — Gauteng Province"
                      value={work.employer}
                      onChange={(ev) => updateWork(i, { employer: ev.target.value })}
                    />
                    <FieldError msg={e.employer} />
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
                      Post held
                    </label>
                    <input
                      type="text"
                      className={e.post ? inputErr : inputOk}
                      placeholder="Assistant Director: HR Management"
                      value={work.post}
                      onChange={(ev) => updateWork(i, { post: ev.target.value })}
                    />
                    <FieldError msg={e.post} />
                  </div>

                  {/* Period — From / To */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
                        From
                      </p>
                      <div className="flex gap-2">
                        <select
                          className={selectOk}
                          value={work.from_month}
                          onChange={(ev) =>
                            updateWork(i, { from_month: ev.target.value })
                          }
                        >
                          <option value="">Month</option>
                          {MONTHS.map((m) => (
                            <option key={m.value} value={m.value}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={4}
                          className={e.from_year ? inputErr : inputOk}
                          style={{ width: "5rem", flexShrink: 0 }}
                          placeholder="2018"
                          value={work.from_year}
                          onChange={(ev) =>
                            updateWork(i, {
                              from_year: ev.target.value.replace(/\D/g, ""),
                            })
                          }
                        />
                      </div>
                      <FieldError msg={e.from_year} />
                    </div>

                    <div>
                      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
                        To{" "}
                        <span className="normal-case font-normal text-[var(--color-muted)]">
                          — blank if current
                        </span>
                      </p>
                      <div className="flex gap-2">
                        <select
                          className={selectOk}
                          value={work.to_month}
                          onChange={(ev) =>
                            updateWork(i, { to_month: ev.target.value })
                          }
                        >
                          <option value="">Month</option>
                          {MONTHS.map((m) => (
                            <option key={m.value} value={m.value}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={4}
                          className={e.to_year ? inputErr : inputOk}
                          style={{ width: "5rem", flexShrink: 0 }}
                          placeholder="2022"
                          value={work.to_year}
                          onChange={(ev) =>
                            updateWork(i, {
                              to_year: ev.target.value.replace(/\D/g, ""),
                            })
                          }
                        />
                      </div>
                      <FieldError msg={e.to_year} />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
                      Reason for leaving
                    </label>
                    <input
                      type="text"
                      className={inputOk}
                      placeholder={isCurrent ? "Currently employed" : "Career advancement"}
                      value={work.reason}
                      onChange={(ev) => updateWork(i, { reason: ev.target.value })}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {sectionF.length < 3 && (
            <button
              type="button"
              onClick={addWork}
              className="w-full border border-dashed border-[var(--color-line)] py-2.5 text-sm text-[var(--color-muted)] hover:border-[var(--color-line-hover)] hover:text-[var(--color-ink)] transition-colors"
            >
              + Add position
            </button>
          )}
        </div>
      </section>

      {/* ── References ────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-1 text-base font-semibold text-[var(--color-ink)]">
          References
        </h2>
        <p className="mb-5 text-sm text-[var(--color-muted)]">
          Up to 3 professional references. Use office hours telephone numbers.
        </p>

        <div className="space-y-4">
          {sectionG.map((ref, i) => {
            const e = refErrs[i];
            return (
              <div key={i} className="border border-[var(--color-line)] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
                    Reference {i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeRef(i)}
                    className="text-xs text-[var(--color-muted)] hover:text-[var(--color-rust)] transition-colors"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
                      Name
                    </label>
                    <input
                      type="text"
                      className={e.name ? inputErr : inputOk}
                      placeholder="Dr. Nomvula Mthembu"
                      value={ref.name}
                      onChange={(ev) => updateRef(i, { name: ev.target.value })}
                    />
                    <FieldError msg={e.name} />
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
                      Relationship to you
                    </label>
                    <input
                      type="text"
                      className={inputOk}
                      placeholder="Line Manager"
                      value={ref.relationship}
                      onChange={(ev) => updateRef(i, { relationship: ev.target.value })}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
                      Telephone (office hours)
                    </label>
                    <input
                      type="tel"
                      inputMode="tel"
                      className={e.tel ? inputErr : inputOk}
                      placeholder="012 345 6789"
                      value={ref.tel}
                      onChange={(ev) => updateRef(i, { tel: ev.target.value })}
                    />
                    <FieldError msg={e.tel} />
                  </div>
                </div>
              </div>
            );
          })}

          {sectionG.length < 3 && (
            <button
              type="button"
              onClick={addRef}
              className="w-full border border-dashed border-[var(--color-line)] py-2.5 text-sm text-[var(--color-muted)] hover:border-[var(--color-line-hover)] hover:text-[var(--color-ink)] transition-colors"
            >
              + Add reference
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
