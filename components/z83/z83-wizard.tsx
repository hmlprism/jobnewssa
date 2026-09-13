"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { StepA } from "./step-a";
import { StepB } from "./step-b";
import { StepC } from "./step-c";
import { StepD } from "./step-d";
import type { Z83FillData, Z83DraftData, Z83SectionB, Z83Declarations } from "@/types/z83";

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 7;

const STEP_LABELS = [
  "Job",
  "Personal",
  "Declarations",
  "Contact",
  "Qualifications",
  "Experience",
  "Preview",
];

// ─── Default state ────────────────────────────────────────────────────────────

const DEFAULT_SECTION_B: Z83SectionB = {
  name: "",
  passport_number: "",
  race: "",
  gender: "",
  disability: false,
  sa_citizen: true,
  work_permit: false,
  preferred_language: "",
  communication_pref: "",
  contact_details: "",
  nationality: "",
  years_private_sector: "",
  years_public_sector: "",
  professional_reg_date: "",
  professional_reg_number: "",
};

const DEFAULT_DECLARATIONS: Z83Declarations = {
  // All Yes/No fields start as null — user must consciously select an answer.
  // Defaulting to false would mean someone could submit "No" to criminal/disciplinary
  // questions without having deliberately chosen that answer.
  criminal_conviction: null,
  criminal_conviction_details: "",
  pending_criminal: null,
  pending_criminal_details: "",
  dismissed_misconduct: null,
  dismissed_misconduct_details: "",
  pending_disciplinary: null,
  pending_disciplinary_details: "",
  resigned_pending: null,
  resigned_pending_details: "",
  discharged_ill_health: null,
  business_with_state: null,
  business_with_state_details: "",
  will_relinquish: null,
  ps_reappointment_details: "",
};

const DEFAULT_Z83: Z83FillData = {
  section_a: { position: "", department: "", ref_no: "", availability: "" },
  section_b: DEFAULT_SECTION_B,
  section_d: [],
  section_e: [],
  section_e_current: "",
  section_f: [],
  section_f_ps_reappointment: null,
  section_g: [],
  // Sensitive — never stored in DB, always starts blank each session
  id_number: "",
  dob: "",
  section_b_declarations: DEFAULT_DECLARATIONS,
  page1_initials: null,
  page2_initials: null,
  signature: null,
  declaration_date: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Extract the storable portion — never include sensitive fields in the API call.
function toDraftData(d: Z83FillData): Z83DraftData {
  return {
    section_a: d.section_a,
    section_b: d.section_b,
    section_d: d.section_d,
    section_e: d.section_e,
    section_e_current: d.section_e_current,
    section_f: d.section_f,
    section_f_ps_reappointment: d.section_f_ps_reappointment,
    section_g: d.section_g,
  };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  // Non-sensitive draft loaded from z83_drafts by the server component.
  // null = no draft saved yet (or user is anonymous).
  initialDraft: Z83DraftData | null;
  isLoggedIn: boolean;
}

// ─── Wizard ───────────────────────────────────────────────────────────────────

export function Z83Wizard({ initialDraft, isLoggedIn }: Props) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<Z83FillData>(() => {
    if (initialDraft) {
      // Merge saved non-sensitive draft into the default (adds blank sensitive fields).
      // section_f_ps_reappointment is always reset to null regardless of what was stored —
      // same session-only discipline as all other declaration fields. Old drafts may have
      // stored the previous default (false), which would silently pre-answer this question.
      return { ...DEFAULT_Z83, ...initialDraft, section_f_ps_reappointment: null };
    }
    return DEFAULT_Z83;
    // NOTE: no localStorage fallback — Z83 is session-only even for anonymous users
    // because sensitive declaration data must not persist in the browser.
  });
  const [attempted, setAttempted] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Reset attempted whenever the step changes
  useEffect(() => {
    setAttempted(false);
  }, [step]);

  // Auto-save (logged-in users only) — strips sensitive fields before sending
  const saveDraft = useCallback(async (d: Z83FillData) => {
    if (!isLoggedIn) return;
    try {
      await fetch("/api/tools/z83/draft", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toDraftData(d)),
      });
    } catch {
      // Silent — auto-save failure must not interrupt the user
    }
  }, [isLoggedIn]);

  // ── Per-step validation ───────────────────────────────────────────────────
  const stepIsValid = useMemo(() => {
    const a = data.section_a;
    if (step === 1) {
      return (
        a.position.trim().length >= 5 && /[a-zA-Z]/.test(a.position) &&
        a.department.trim().length >= 5 && /[a-zA-Z]/.test(a.department) &&
        a.ref_no.trim().length >= 3 && !/^(.)\1*$/.test(a.ref_no.trim()) &&
        a.availability.trim().length >= 5 && /[a-zA-Z]/.test(a.availability)
      );
    }
    if (step === 2) {
      const b = data.section_b;
      return (
        b.name.trim().length >= 2 &&
        /[a-zA-Z]/.test(b.name) &&
        /^\d{6}$/.test(data.dob) &&
        !!b.race &&
        !!b.gender &&
        (!data.id_number || data.id_number.length === 13) &&
        (!b.passport_number ||
          (b.passport_number.trim().length >= 3 &&
            /[a-zA-Z]/.test(b.passport_number)))
      );
    }
    if (step === 3) {
      const d = data.section_b_declarations;
      return (
        d.criminal_conviction !== null &&
        d.pending_criminal !== null &&
        d.dismissed_misconduct !== null &&
        d.pending_disciplinary !== null &&
        d.resigned_pending !== null &&
        d.discharged_ill_health !== null &&
        d.business_with_state !== null &&
        (d.business_with_state !== true || d.will_relinquish !== null) &&
        data.section_f_ps_reappointment !== null
      );
    }
    if (step === 4) {
      const b = data.section_b;
      return !!b.communication_pref && b.contact_details.trim().length > 0;
    }
    // Remaining steps: always valid for now (individual steps add their own rules)
    return true;
  }, [step, data.section_a, data.section_b, data.dob, data.id_number, data.section_b_declarations, data.section_f_ps_reappointment]);

  // ── PDF download ──────────────────────────────────────────────────────────
  const handleDownload = useCallback(async () => {
    setDownloading(true);
    setDownloadError(null);
    try {
      const res = await fetch("/api/tools/z83/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? `Server error ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(data.section_b.name || "Z83").replace(/\s+/g, "-")}-Z83.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(
        err instanceof Error ? err.message : "Download failed. Please try again."
      );
    } finally {
      setDownloading(false);
    }
  }, [data]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const goNext = () => {
    if (!stepIsValid) {
      setAttempted(true);
      return;
    }
    if (step < TOTAL_STEPS) {
      saveDraft(data);
      setStep((s) => s + 1);
    }
  };

  const goBack = () => {
    if (step > 1) {
      saveDraft(data);
      setStep((s) => s - 1);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Step indicator */}
      <nav aria-label="Z83 form steps" className="mb-8">
        <ol className="flex gap-0 overflow-x-auto">
          {STEP_LABELS.map((label, idx) => {
            const n = idx + 1;
            const isCurrent = n === step;
            const isDone = n < step;
            return (
              <li key={n} className="flex items-center">
                <button
                  type="button"
                  onClick={() => {
                    if (n < step || (n === step + 1 && stepIsValid)) {
                      setStep(n);
                    }
                  }}
                  disabled={n > step + 1 || (n === step + 1 && !stepIsValid)}
                  aria-current={isCurrent ? "step" : undefined}
                  className={[
                    "flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors",
                    isCurrent
                      ? "bg-[var(--color-ink)] text-[var(--color-paper)]"
                      : isDone
                      ? "text-[var(--color-ink)] hover:bg-[var(--color-paper-dim)]"
                      : "text-[var(--color-muted)] cursor-default",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "flex h-5 w-5 items-center justify-center text-[10px] font-semibold border",
                      isCurrent
                        ? "border-[var(--color-paper)] text-[var(--color-paper)]"
                        : isDone
                        ? "border-[var(--color-ink)] text-[var(--color-ink)]"
                        : "border-[var(--color-line)] text-[var(--color-muted)]",
                    ].join(" ")}
                  >
                    {n}
                  </span>
                  <span className="hidden sm:inline">{label}</span>
                </button>
                {idx < STEP_LABELS.length - 1 && (
                  <span className="text-[var(--color-line)] select-none px-0.5 text-xs">
                    /
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Step content */}
      <div className="min-h-[320px]">
        {step === 1 && (
          <StepA
            data={data.section_a}
            attempted={attempted}
            onChange={(section_a) => setData((d) => ({ ...d, section_a }))}
          />
        )}

        {step === 2 && (
          <StepB
            sectionB={data.section_b}
            dob={data.dob}
            idNumber={data.id_number}
            attempted={attempted}
            onSectionBChange={(section_b) => setData((d) => ({ ...d, section_b }))}
            onDobChange={(dob) => setData((d) => ({ ...d, dob }))}
            onIdNumberChange={(id_number) => setData((d) => ({ ...d, id_number }))}
          />
        )}

        {step === 3 && (
          <StepC
            declarations={data.section_b_declarations}
            onDeclarationsChange={(section_b_declarations) =>
              setData((d) => ({ ...d, section_b_declarations }))
            }
            psPreviousEmployee={data.section_f_ps_reappointment}
            onPsPreviousEmployeeChange={(section_f_ps_reappointment) =>
              setData((d) => ({ ...d, section_f_ps_reappointment }))
            }
            attempted={attempted}
          />
        )}

        {step === 4 && (
          <StepD
            sectionB={data.section_b}
            sectionD={data.section_d}
            attempted={attempted}
            onSectionBChange={(section_b) => setData((d) => ({ ...d, section_b }))}
            onSectionDChange={(section_d) => setData((d) => ({ ...d, section_d }))}
          />
        )}

        {/* Steps 5–6 will be added in subsequent build phases */}
        {step > 4 && step < TOTAL_STEPS && (
          <div className="flex items-center justify-center py-20 border border-dashed border-[var(--color-line)]">
            <p className="text-sm text-[var(--color-muted)]">
              Step {step} — coming soon
            </p>
          </div>
        )}

        {step === TOTAL_STEPS && (
          <div className="space-y-6">
            <p className="text-sm text-[var(--color-muted)]">
              Preview and download your Z83 form.
            </p>
            <Button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? "Generating…" : "Download Z83 PDF"}
            </Button>
            {downloadError && (
              <p className="text-sm text-[var(--color-rust)]">{downloadError}</p>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between border-t border-[var(--color-line)] pt-6">
        <div>
          {step > 1 && (
            <Button type="button" variant="ghost" onClick={goBack}>
              Back
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--color-muted)]">
            Step {step} of {TOTAL_STEPS}
          </span>
          {step < TOTAL_STEPS && (
            <Button type="button" onClick={goNext}>
              {step === TOTAL_STEPS - 1 ? "Review" : "Next"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
