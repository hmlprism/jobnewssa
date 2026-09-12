"use client";

import { Download, Loader2 } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/button";
import type { CvData } from "@/types/cv";

interface Props {
  data: CvData;
  idNumber: string;
  avatarUrl: string | null;
  isLoggedIn: boolean;
  onDownload: () => void;
  downloading: boolean;
}

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 py-2 border-b border-[var(--color-line)] last:border-0">
      <span className="w-36 flex-shrink-0 text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
        {label}
      </span>
      <span className="text-sm text-[var(--color-ink)]">{value}</span>
    </div>
  );
}

export function StepPreview({
  data,
  idNumber,
  avatarUrl,
  isLoggedIn,
  onDownload,
  downloading,
}: Props) {
  const { contact, summary, work_experience, education, skills } = data;

  const contactParts = [
    contact.email,
    contact.phone,
    contact.city && contact.province
      ? `${contact.city}, ${contact.province}`
      : contact.city || contact.province,
    contact.linkedin,
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Name preview */}
      <div className="border border-[var(--color-line)] bg-[var(--color-paper-dim)] p-5">
        <p className="font-display text-2xl font-semibold text-[var(--color-ink)]">
          {contact.name || (
            <span className="text-[var(--color-muted)]">No name entered</span>
          )}
        </p>
        {contactParts.length > 0 && (
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {contactParts.join("  ·  ")}
          </p>
        )}
      </div>

      {/* Content summary */}
      <div className="divide-y divide-[var(--color-line)] border border-[var(--color-line)]">
        <div className="p-4">
          <Row label="Summary" value={summary ? `${summary.slice(0, 100)}…` : ""} />
        </div>
        <div className="p-4 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)] mb-2">
            Work experience
          </p>
          {work_experience.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">None added</p>
          ) : (
            work_experience.map((e, i) => (
              <p key={i} className="text-sm text-[var(--color-ink)]">
                {e.title} — {e.employer}{" "}
                <span className="text-[var(--color-muted)]">
                  ({e.start} – {e.current ? "Present" : e.end})
                </span>
              </p>
            ))
          )}
        </div>
        <div className="p-4 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)] mb-2">
            Education
          </p>
          {education.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">None added</p>
          ) : (
            education.map((e, i) => (
              <p key={i} className="text-sm text-[var(--color-ink)]">
                {e.qualification}
                {e.institution ? ` — ${e.institution}` : ""}
                {e.year ? ` (${e.year})` : ""}
              </p>
            ))
          )}
        </div>
        <div className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)] mb-2">
            Skills
          </p>
          <p className="text-sm text-[var(--color-ink)]">
            {[...skills.technical, ...skills.soft].join(", ") || (
              <span className="text-[var(--color-muted)]">None added</span>
            )}
          </p>
        </div>
        {idNumber && (
          <div className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)] mb-1">
              ID number (PDF only)
            </p>
            <p className="text-sm text-[var(--color-ink)] font-mono">{idNumber}</p>
          </div>
        )}
        {data.include_photo && avatarUrl && (
          <div className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
              Photo — included
            </p>
          </div>
        )}
      </div>

      {/* Save to account CTA for anonymous users */}
      {!isLoggedIn && (
        <div className="border border-[var(--color-amber)] bg-[var(--color-amber-dim)] p-4 text-sm">
          <p className="font-medium text-[var(--color-ink)] mb-1">
            Your CV is saved in this browser only.
          </p>
          <p className="text-[var(--color-muted)] mb-3">
            Sign in or create a free account to save your CV and access it from
            any device.
          </p>
          <LinkButton href="/auth/signup" size="sm" variant="ghost">
            Create account — it&apos;s free
          </LinkButton>
        </div>
      )}

      {/* Download */}
      <div className="flex items-center gap-4 pt-2">
        <Button
          type="button"
          onClick={onDownload}
          disabled={downloading || !contact.name || !contact.email}
          className="gap-2"
        >
          {downloading ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Download size={15} />
              Download PDF
            </>
          )}
        </Button>
        {(!contact.name || !contact.email) && (
          <p className="text-sm text-[var(--color-muted)]">
            Name and email are required before downloading.
          </p>
        )}
      </div>
    </div>
  );
}
