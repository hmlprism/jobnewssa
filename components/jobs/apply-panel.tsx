"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function ApplyPanel({ jobId }: { jobId: string }) {
  const [status, setStatus] = useState<"loading" | "signed_out" | "no_resume" | "ready" | "applied" | "submitting">(
    "loading"
  );
  const [coverNote, setCoverNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setStatus("signed_out");
        return;
      }
      const [{ data: profile }, { data: existing }] = await Promise.all([
        supabase.from("profiles").select("resume_url").eq("id", user.id).single(),
        supabase
          .from("applications")
          .select("id")
          .eq("job_id", jobId)
          .eq("applicant_id", user.id)
          .maybeSingle(),
      ]);
      if (!profile?.resume_url) {
        setStatus("no_resume");
        return;
      }
      setStatus(existing ? "applied" : "ready");
    });
  }, [jobId]);

  async function submitApplication() {
    setStatus("submitting");
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setStatus("signed_out");
      return;
    }
    const { error: insertError } = await supabase.from("applications").insert({
      job_id: jobId,
      applicant_id: user.id,
      cover_note: coverNote || null,
    });
    if (insertError) {
      setError(insertError.message);
      setStatus("ready");
      return;
    }
    setStatus("applied");
  }

  if (status === "loading") {
    return <div className="h-24 animate-pulse bg-[var(--color-paper-dim)]" />;
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
      <div className="border border-[var(--color-line)] px-4 py-4">
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
      <div className="border-t border-[var(--color-line)] pt-5">
        <p className="font-display text-xl text-[var(--color-ink)]">Your application is in.</p>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          The employer will be in touch if your profile is a match. In the meantime,{" "}
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
        Cover note (optional)
      </label>
      <textarea
        id="cover-note"
        value={coverNote}
        onChange={(e) => setCoverNote(e.target.value)}
        rows={5}
        className="mb-3 w-full border border-[var(--color-line)] bg-[var(--color-paper)] p-2 text-sm"
        placeholder="Briefly say why you're a fit for this role"
      />
      {error && <p className="mb-2 text-sm text-[var(--color-rust)]">{error}</p>}
      <Button
        onClick={submitApplication}
        disabled={status === "submitting"}
        className="w-full justify-center"
      >
        {status === "submitting" ? "Submitting…" : "Submit application"}
      </Button>
    </div>
  );
}
