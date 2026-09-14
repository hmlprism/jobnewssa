"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/navigation";
import { useTranslations } from "next-intl";

type ApplyStatus = "signed_out" | "no_resume" | "ready" | "applied" | "submitting";

export function ApplyPanel({
  jobId,
  userId,
  initialStatus,
}: {
  jobId: string;
  userId: string | null;
  initialStatus: Exclude<ApplyStatus, "submitting">;
}) {
  const t = useTranslations("Jobs.apply");
  const [status, setStatus] = useState<ApplyStatus>(initialStatus);
  const [coverNote, setCoverNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submitApplication() {
    setStatus("submitting");
    setError(null);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("applications").insert({
      job_id: jobId,
      applicant_id: userId,
      cover_note: coverNote || null,
    });
    if (insertError) {
      setError(insertError.message);
      setStatus("ready");
      return;
    }
    setStatus("applied");
  }

  if (status === "signed_out") {
    return (
      <div>
        <p className="mb-3 text-sm text-[var(--color-muted)]">
          {t("signedOutNote")}
        </p>
        <Link
          href="/auth/login"
          prefetch={false}
          className="inline-flex w-full justify-center bg-[var(--color-rust)] px-4 py-2.5 text-sm font-medium text-[var(--color-paper)] hover:bg-[var(--color-rust-dark)]"
        >
          {t("signInToApply")}
        </Link>
      </div>
    );
  }

  if (status === "no_resume") {
    return (
      <div>
        <p className="mb-3 text-sm text-[var(--color-muted)]">
          {t("noResumeNote")}
        </p>
        <Link
          href="/profile/edit"
          prefetch={false}
          className="inline-flex w-full justify-center bg-[var(--color-rust)] px-4 py-2.5 text-sm font-medium text-[var(--color-paper)] hover:bg-[var(--color-rust-dark)]"
        >
          {t("completeProfile")}
        </Link>
      </div>
    );
  }

  if (status === "applied") {
    return (
      <div>
        <p className="font-display text-lg text-[var(--color-gold)]">
          {t("appliedTitle")}
        </p>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          {t.rich("appliedBody", {
            link: (chunks) => (
              <Link
                href="/jobs"
                prefetch={false}
                className="text-[var(--color-ink)] underline underline-offset-2 hover:text-[var(--color-rust)]"
              >
                {chunks}
              </Link>
            ),
          })}
        </p>
      </div>
    );
  }

  return (
    <div>
      <label htmlFor="cover-note" className="mb-2 block text-sm font-medium">
        {t("coverNoteLabel")}{" "}
        <span className="font-normal text-[var(--color-muted)]">{t("coverNoteOptional")}</span>
      </label>
      <textarea
        id="cover-note"
        value={coverNote}
        onChange={(e) => setCoverNote(e.target.value)}
        rows={5}
        className="mb-3 w-full border border-[var(--color-line)] bg-[var(--color-paper)] p-3 text-sm"
        placeholder={t("coverNotePlaceholder")}
      />
      {error && (
        <p className="mb-2 text-sm text-[var(--color-rust)]">{error}</p>
      )}
      <Button
        onClick={submitApplication}
        disabled={status === "submitting"}
        className="w-full justify-center"
      >
        {status === "submitting" ? t("submitting") : t("submit")}
      </Button>
    </div>
  );
}
