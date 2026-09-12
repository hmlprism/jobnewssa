"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { StepContact } from "./step-contact";
import { StepSummary } from "./step-summary";
import { StepWork } from "./step-work";
import { StepEduSkills } from "./step-edu-skills";
import { StepPreview } from "./step-preview";
import type { CvData } from "@/types/cv";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LS_KEY = "cv_maker_draft_v1";
const TOTAL_STEPS = 5;

const STEP_LABELS = [
  "Contact",
  "Summary",
  "Experience",
  "Education",
  "Preview",
];

const DEFAULT_CV: CvData = {
  contact: { name: "", email: "", phone: "", city: "", province: "", linkedin: "" },
  summary: "",
  work_experience: [],
  education: [],
  skills: { technical: [], soft: [] },
  references_on_request: true,
  template: "broadsheet",
  include_photo: false,
};

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

function lsLoad(): { data: CvData; idNumber: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function lsSave(data: CvData, idNumber: string) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ data, idNumber }));
  } catch {}
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  initialData: CvData | null; // from server (draft or profile pre-fill), or null
  avatarUrl: string | null;    // from profile.avatar_url — for photo embedding
  isLoggedIn: boolean;
}

// ---------------------------------------------------------------------------
// Wizard
// ---------------------------------------------------------------------------

export function CvWizard({ initialData, avatarUrl, isLoggedIn }: Props) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<CvData>(() => {
    // Logged-in users: use server data (draft or profile pre-fill).
    // Anonymous users: check localStorage, then empty.
    if (isLoggedIn) return initialData ?? DEFAULT_CV;
    const ls = lsLoad();
    return ls?.data ?? initialData ?? DEFAULT_CV;
  });
  const [idNumber, setIdNumber] = useState<string>(() => {
    if (isLoggedIn) return "";
    return lsLoad()?.idNumber ?? "";
  });
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Persist to localStorage on every change for anonymous users.
  // Logged-in auto-save to DB is wired in Step 6.
  useEffect(() => {
    if (!isLoggedIn) {
      lsSave(data, idNumber);
    }
  }, [data, idNumber, isLoggedIn]);

  // ---------------------------------------------------------------------------
  // Validation — gate "Next" per step
  // ---------------------------------------------------------------------------
  const canProceed = useCallback((): boolean => {
    if (step === 1) return !!(data.contact.name.trim() && data.contact.email.trim());
    return true; // steps 2–4 are optional content; no hard gate
  }, [step, data.contact.name, data.contact.email]);

  // ---------------------------------------------------------------------------
  // PDF download
  // ---------------------------------------------------------------------------
  const handleDownload = useCallback(async () => {
    setDownloading(true);
    setDownloadError(null);
    try {
      const res = await fetch("/api/tools/cv/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cv: data,
          id_number: idNumber,
          photo_url: data.include_photo ? avatarUrl : null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? `Server error ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.contact.name.replace(/\s+/g, "-") || "cv"}-CV.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  }, [data, idNumber, avatarUrl]);

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------
  const goNext = () => {
    if (canProceed() && step < TOTAL_STEPS) setStep((s) => s + 1);
  };
  const goBack = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div>
      {/* Step indicator */}
      <nav aria-label="CV Maker steps" className="mb-8">
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
                    // Allow jumping back; jumping forward requires passing current step
                    if (n < step || (n === step + 1 && canProceed())) {
                      setStep(n);
                    }
                  }}
                  className={[
                    "flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors",
                    isCurrent
                      ? "bg-[var(--color-ink)] text-[var(--color-paper)]"
                      : isDone
                      ? "text-[var(--color-ink)] hover:bg-[var(--color-paper-dim)]"
                      : "text-[var(--color-muted)] cursor-default",
                  ].join(" ")}
                  aria-current={isCurrent ? "step" : undefined}
                  disabled={n > step + 1 || (n === step + 1 && !canProceed())}
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
          <StepContact
            contact={data.contact}
            idNumber={idNumber}
            includePhoto={data.include_photo}
            hasAvatar={isLoggedIn && !!avatarUrl}
            onChange={(contact) => setData((d) => ({ ...d, contact }))}
            onIdNumberChange={setIdNumber}
            onIncludePhotoChange={(include_photo) =>
              setData((d) => ({ ...d, include_photo }))
            }
          />
        )}
        {step === 2 && (
          <StepSummary
            summary={data.summary}
            onChange={(summary) => setData((d) => ({ ...d, summary }))}
          />
        )}
        {step === 3 && (
          <StepWork
            entries={data.work_experience}
            onChange={(work_experience) =>
              setData((d) => ({ ...d, work_experience }))
            }
          />
        )}
        {step === 4 && (
          <StepEduSkills
            education={data.education}
            skills={data.skills}
            refsOnRequest={data.references_on_request}
            onEducationChange={(education) =>
              setData((d) => ({ ...d, education }))
            }
            onSkillsChange={(skills) => setData((d) => ({ ...d, skills }))}
            onRefsChange={(references_on_request) =>
              setData((d) => ({ ...d, references_on_request }))
            }
          />
        )}
        {step === 5 && (
          <StepPreview
            data={data}
            idNumber={idNumber}
            avatarUrl={avatarUrl}
            isLoggedIn={isLoggedIn}
            onDownload={handleDownload}
            downloading={downloading}
          />
        )}
      </div>

      {/* Download error */}
      {downloadError && step === 5 && (
        <p className="mt-4 text-sm text-[var(--color-rust)]">{downloadError}</p>
      )}

      {/* Navigation buttons */}
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
            <Button
              type="button"
              onClick={goNext}
              disabled={!canProceed()}
            >
              {step === TOTAL_STEPS - 1 ? "Preview" : "Next"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
