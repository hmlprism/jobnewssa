"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/lib/navigation";

const CONFIRM_PHRASE = "DELETE MY ACCOUNT";

const inputClass =
  "w-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2.5 text-sm";

export function DeleteAccountPanel() {
  const router = useRouter();
  const [phrase, setPhrase] = useState("");
  const [status, setStatus] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const confirmed = phrase === CONFIRM_PHRASE;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmed) return;
    setStatus("busy");
    setErrorMsg(null);

    const res = await fetch("/api/account/delete-account", { method: "POST" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErrorMsg(body.error ?? "Something went wrong. Please try again.");
      setStatus("error");
      return;
    }

    // Sign out client-side — the server already banned the auth session
    const supabase = createClient();
    await supabase.auth.signOut();
    setStatus("done");
    router.push("/");
  }

  return (
    <div className="border border-[var(--color-line)] p-6">
      <h2 className="border-b border-[var(--color-line)] pb-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
        Delete my account
      </h2>

      {status === "done" ? (
        <p className="mt-4 text-sm">Signing you out…</p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <p className="text-sm leading-relaxed">
            Your account will be deactivated immediately. All your data will be
            permanently deleted after a <strong>30-day grace period</strong>. During
            those 30 days you can contact us at{" "}
            <a
              href="mailto:contactjobnewssa@gmail.com"
              className="underline hover:text-[var(--color-rust)]"
            >
              contactjobnewssa@gmail.com
            </a>{" "}
            to cancel.
          </p>
          <p className="text-sm font-medium">
            After 30 days, your account and all data are permanently deleted and
            cannot be recovered. Type{" "}
            <span className="font-mono">DELETE MY ACCOUNT</span> below to confirm.
          </p>
          <div>
            <label
              htmlFor="delete-account-confirm"
              className="mb-1.5 block text-sm font-medium"
            >
              Confirmation
            </label>
            <input
              id="delete-account-confirm"
              type="text"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder="DELETE MY ACCOUNT"
              className={inputClass}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          {errorMsg && (
            <p className="text-sm text-[var(--color-rust)]">{errorMsg}</p>
          )}
          <button
            type="submit"
            disabled={!confirmed || status === "busy"}
            className="bg-[var(--color-rust)] px-4 py-2 text-sm font-medium text-[var(--color-paper)] hover:bg-[var(--color-rust-dark)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {status === "busy" ? "Processing…" : "Delete my account"}
          </button>
        </form>
      )}
    </div>
  );
}
