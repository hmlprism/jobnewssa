"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CvEducationEntry, CvSkills } from "@/types/cv";

interface Props {
  education: CvEducationEntry[];
  skills: CvSkills;
  refsOnRequest: boolean;
  onEducationChange: (entries: CvEducationEntry[]) => void;
  onSkillsChange: (skills: CvSkills) => void;
  onRefsChange: (val: boolean) => void;
}

const EMPTY_EDU: CvEducationEntry = {
  institution: "",
  qualification: "",
  year: "",
  nqf_level: "",
};

const NQF = [
  { value: "4", label: "4 — National Senior Certificate (Matric)" },
  { value: "5", label: "5 — Higher Certificate" },
  { value: "6", label: "6 — Diploma / Advanced Certificate" },
  { value: "7", label: "7 — Bachelor's Degree / Advanced Diploma" },
  { value: "8", label: "8 — Honours / Postgraduate Diploma" },
  { value: "9", label: "9 — Master's Degree" },
  { value: "10", label: "10 — Doctoral Degree" },
];

const input =
  "w-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder-[var(--color-muted)] focus:border-[var(--color-ink)] focus:outline-none";

export function StepEduSkills({
  education,
  skills,
  refsOnRequest,
  onEducationChange,
  onSkillsChange,
  onRefsChange,
}: Props) {
  const updateEdu = (i: number, patch: Partial<CvEducationEntry>) => {
    onEducationChange(education.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  };
  const removeEdu = (i: number) => onEducationChange(education.filter((_, idx) => idx !== i));
  const addEdu = () => onEducationChange([...education, { ...EMPTY_EDU }]);

  // Skills stored as arrays; display as comma-separated strings
  const techStr = skills.technical.join(", ");
  const softStr = skills.soft.join(", ");

  const parseCsv = (val: string): string[] =>
    val.split(",").map((s) => s.trim()).filter(Boolean);

  return (
    <div className="space-y-8">
      {/* ── Education ─────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-base font-semibold text-[var(--color-ink)]">
          Education
        </h2>

        {education.length === 0 && (
          <p className="mb-4 border border-[var(--color-line)] p-4 text-center text-sm text-[var(--color-muted)]">
            No education entries added yet.
          </p>
        )}

        {education.map((entry, i) => (
          <div
            key={i}
            className="mb-4 border border-[var(--color-line)] p-5 space-y-4"
          >
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-sm font-medium text-[var(--color-ink)]">
                Qualification {i + 1}
              </h3>
              <button
                type="button"
                onClick={() => removeEdu(i)}
                className="text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors"
                aria-label="Remove qualification"
              >
                <Trash2 size={15} />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-[var(--color-ink)]">
                  Qualification name
                </label>
                <input
                  type="text"
                  className={input}
                  placeholder="Bachelor of Commerce (Accounting)"
                  value={entry.qualification}
                  onChange={(e) => updateEdu(i, { qualification: e.target.value })}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--color-ink)]">
                  Institution
                </label>
                <input
                  type="text"
                  className={input}
                  placeholder="University of the Witwatersrand"
                  value={entry.institution}
                  onChange={(e) => updateEdu(i, { institution: e.target.value })}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--color-ink)]">
                  Year completed
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  className={input}
                  placeholder="2020"
                  value={entry.year}
                  onChange={(e) =>
                    updateEdu(i, { year: e.target.value.replace(/\D/g, "") })
                  }
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--color-ink)]">
                  NQF level{" "}
                  <span className="font-normal text-[var(--color-muted)]">
                    (optional)
                  </span>
                </label>
                <select
                  className={input}
                  value={entry.nqf_level}
                  onChange={(e) => updateEdu(i, { nqf_level: e.target.value })}
                >
                  <option value="">— Select —</option>
                  {NQF.map((n) => (
                    <option key={n.value} value={n.value}>
                      {n.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}

        {education.length < 5 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addEdu}
            className="gap-1.5"
          >
            <Plus size={14} />
            Add qualification
          </Button>
        )}
      </section>

      {/* ── Skills ────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-1 text-base font-semibold text-[var(--color-ink)]">
          Skills
        </h2>
        <p className="mb-4 text-sm text-[var(--color-muted)]">
          Separate each skill with a comma.
        </p>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-ink)]">
              Technical / hard skills
            </label>
            <input
              type="text"
              className={input}
              placeholder="IFRS, Excel, SAP, Power BI, Caseware"
              value={techStr}
              onChange={(e) =>
                onSkillsChange({ ...skills, technical: parseCsv(e.target.value) })
              }
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-ink)]">
              Soft skills
            </label>
            <input
              type="text"
              className={input}
              placeholder="Team leadership, analytical thinking, deadline management"
              value={softStr}
              onChange={(e) =>
                onSkillsChange({ ...skills, soft: parseCsv(e.target.value) })
              }
            />
          </div>
        </div>
      </section>

      {/* ── References ────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-[var(--color-ink)]">
          References
        </h2>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={refsOnRequest}
            onChange={(e) => onRefsChange(e.target.checked)}
          />
          <span className="text-sm text-[var(--color-ink)]">
            Add &ldquo;References available on request&rdquo; to the CV
            <span className="block text-xs text-[var(--color-muted)]">
              This is standard practice in South Africa. Named referees can be
              provided when requested.
            </span>
          </span>
        </label>
      </section>
    </div>
  );
}
