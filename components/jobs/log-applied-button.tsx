"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Check } from "lucide-react";

export function LogAppliedButton({
  jobId,
  userId,
  initialApplied = false,
}: {
  jobId: string;
  userId: string | null;
  initialApplied?: boolean;
}) {
  const [applied, setApplied] = useState(initialApplied);
  const [loading, setLoading] = useState(false);

  if (!userId) {
    return (
      <p className="text-xs text-[var(--color-muted)]">
        <a
          href={`/auth/login?next=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "")}`}
          className="underline underline-offset-2 hover:text-[var(--color-rust)]"
        >
          Sign in
        </a>{" "}
        to track your applications.
      </p>
    );
  }

  if (applied) {
    return (
      <div className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-gold)]">
        <Check size={14} />
        Marked as applied
      </div>
    );
  }

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.from("applications").upsert(
      { job_id: jobId, applicant_id: userId!, status: "submitted" },
      { onConflict: "job_id,applicant_id" }
    );
    setApplied(true);
    setLoading(false);
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="w-full cursor-pointer border border-[var(--color-line)] py-2.5 text-sm font-medium text-[var(--color-ink)] transition-colors hover:border-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-[var(--color-paper)] disabled:opacity-50"
    >
      {loading ? "Saving…" : "Mark as applied"}
    </button>
  );
}
