"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import Link from "next/link";

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
          Sign in to apply for this job.
        </p>
        <Link
          href="/auth/login"
          className="inline-flex w-full justify-center bg-[var(--color-rust)] px-4 py-2.5 text-sm font-medium text-[var(--color-paper)] hover:bg-[var(--color-rust-dark)]"
        >
          Sign in to apply
        </Link>
      </div>
    );
  }

  if (status === "no_resume") {
    return (
      <div>
        <p className="mb-3 text-sm text-[var(--color-muted)]">
          You need to upload a resume before you can apply.
        </p>
        <Link
          href="/profile/edit"
          className="inline-flex w-full justify-center bg-[var(--color-rust)] px-4 py-2.5 text-sm font-medium text-[var(--color-paper)] hover:bg-[var(--color-rust-dark)]"
        >
          Complete your profile
        </Link>
      </div>
    );
  }

  if (status === "applied") {
    return (
      <div>
        <p className="font-display text-lg text-[var(--color-ink)]">
          Your application is in.
        </p>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          The employer will be in touch if your profile is a match. In the
          meantime,{" "}
          <Link
            href="/jobs"
            className="text-[var(--color-ink)] underline underline-offset-2 hover:text-[var(--color-rust)]"
          >
            browse more vacancies
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div>
      <label htmlFor="cover-note" className="mb-2 block text-sm font-medium">
        Cover note{" "}
        <span className="font-normal text-[var(--color-muted)]">(optional)</span>
      </label>
      <textarea
        id="cover-note"
        value={coverNote}
        onChange={(e) => setCoverNote(e.target.value)}
        rows={5}
        className="mb-3 w-full border border-[var(--color-line)] bg-[var(--color-paper)] p-3 text-sm"
        placeholder="Briefly say why you're a fit for this role"
      />
      {error && (
        <p className="mb-2 text-sm text-[var(--color-rust)]">{error}</p>
      )}
      <Button
        onClick={submitApplication}
        disabled={status === "submitting"}
        className="w-full justify-center"
      >
        {status === "submitting" ? "Submitting\u2026" : "Submit application"}
      </Button>
    </div>
  );
}
