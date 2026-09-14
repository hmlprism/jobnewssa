"use client";

import type { Z83Qualification } from "@/types/z83";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  sectionE: Z83Qualification[];
  sectionECurrent: string;
  attempted: boolean;
  onSectionEChange: (e: Z83Qualification[]) => void;
  onSectionECurrentChange: (v: string) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_QUAL: Z83Qualification = { institution: "", qualification: "", year: "" };

// ─── Validation helpers ───────────────────────────────────────────────────────

// Empty is always OK — validation only fires on non-empty values.
const validText = (v: string) =>
  v === "" || (v.trim().length >= 3 && /[a-zA-Z]/.test(v));

const validYear = (v: string) => {
  if (v === "") return true;
  const y = parseInt(v, 10);
  return /^\d{4}$/.test(v) && y >= 1950 && y <= 2026;
};

// ─── Shared style helpers ─────────────────────────────────────────────────────

const inputOk =
  "w-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder-[var(--color-muted)] focus:border-[var(--color-ink)] focus:outline-none";
const inputErr =
  "w-full border border-[var(--color-rust)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder-[var(--color-muted)] focus:border-[var(--color-rust)] focus:outline-none";

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-[var(--color-rust)]">{msg}</p>;
}

// ─── Step E ───────────────────────────────────────────────────────────────────

export function StepE({
  sectionE,
  sectionECurrent,
  attempted,
  onSectionEChange,
  onSectionECurrentChange,
}: Props) {
  const addQual = () => {
    if (sectionE.length < 4) onSectionEChange([...sectionE, { ...EMPTY_QUAL }]);
  };
  const updateQual = (i: number, patch: Partial<Z83Qualification>) =>
    onSectionEChange(sectionE.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  const removeQual = (i: number) =>
    onSectionEChange(sectionE.filter((_, idx) => idx !== i));

  // Per-row errors — only computed after first failed Next attempt
  const rowErrs = attempted
    ? sectionE.map((q) => ({
        institution: !validText(q.institution)
          ? "At least 3 characters and must include a letter"
          : undefined,
        qualification: !validText(q.qualification)
          ? "At least 3 characters and must include a letter"
          : undefined,
        year: !validYear(q.year)
          ? "Enter a 4-digit year between 1950 and 2026"
          : undefined,
      }))
    : sectionE.map(() => ({} as Record<string, undefined>));

  return (
    <div className="space-y-10">
      {/* ── Qualifications ───────────────────────────────────────────── */}
      <section>
        <h2 className="mb-1 text-base font-semibold text-[var(--color-ink)]">
          Qualifications
        </h2>
        <p className="mb-5 text-sm text-[var(--color-muted)]">
          Up to 4 rows. List highest qualification first.
        </p>

        <div className="space-y-4">
          {sectionE.map((qual, i) => {
            const e = rowErrs[i];
            return (
              <div key={i} className="border border-[var(--color-line)] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
                    Qualification {i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeQual(i)}
                    className="text-xs text-[var(--color-muted)] hover:text-[var(--color-rust)] transition-colors"
                  >
                    Remove
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
                      Institution
                    </label>
                    <input
                      type="text"
                      className={e.institution ? inputErr : inputOk}
                      placeholder="University of Pretoria"
                      value={qual.institution}
                      onChange={(ev) => updateQual(i, { institution: ev.target.value })}
                    />
                    <FieldError msg={e.institution} />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <div>
                      <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
                        Qualification obtained
                      </label>
                      <input
                        type="text"
                        className={e.qualification ? inputErr : inputOk}
                        placeholder="Bachelor of Arts in Human Resources Management"
                        value={qual.qualification}
                        onChange={(ev) =>
                          updateQual(i, { qualification: ev.target.value })
                        }
                      />
                      <FieldError msg={e.qualification} />
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
                        Year
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={4}
                        className={e.year ? inputErr : inputOk}
                        style={{ width: "5rem" }}
                        placeholder="2012"
                        value={qual.year}
                        onChange={(ev) =>
                          updateQual(i, { year: ev.target.value.replace(/\D/g, "") })
                        }
                      />
                      <FieldError msg={e.year} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {sectionE.length < 4 && (
            <button
              type="button"
              onClick={addQual}
              className="w-full border border-dashed border-[var(--color-line)] py-2.5 text-sm text-[var(--color-muted)] hover:border-[var(--color-line-hover)] hover:text-[var(--color-ink)] transition-colors"
            >
              + Add qualification
            </button>
          )}
        </div>
      </section>

      {/* ── Current studies ───────────────────────────────────────────── */}
      <section>
        <h2 className="mb-1 text-base font-semibold text-[var(--color-ink)]">
          Current studies
        </h2>
        <p className="mb-3 text-sm text-[var(--color-muted)]">
          Leave blank if not currently studying.
        </p>
        <input
          type="text"
          className={inputOk}
          placeholder="University of South Africa — BCom Honours (part-time, in progress)"
          value={sectionECurrent}
          onChange={(e) => onSectionECurrentChange(e.target.value)}
        />
      </section>
    </div>
  );
}
