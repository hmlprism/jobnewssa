"use client";

import { useState } from "react";

const CONFIRM_PHRASE = "DELETE";

const inputClass =
  "w-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2.5 text-sm";

export function DeleteDataPanel() {
  const [phrase, setPhrase] = useState("");
  const [status, setStatus] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const confirmed = phrase === CONFIRM_PHRASE;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmed) return;
    setStatus("busy");
    setErrorMsg(null);

    const res = await fetch("/api/account/delete-data", { method: "POST" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErrorMsg(body.error ?? "Something went wrong. Please try again.");
      setStatus("error");
      return;
    }
    setStatus("done");
  }

  return (
    <div className="border border-[var(--color-line)] p-6">
      <h2 className="border-b border-[var(--color-line)] pb-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
        Delete my data
      </h2>

      {status === "done" ? (
        <p className="mt-4 text-sm text-[var(--color-green)]">
          Your profile data has been deleted. Your account and login are still active.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <p className="text-sm leading-relaxed">
            Permanently deletes your uploaded resume, profile photo, and all profile
            fields — contact details, qualifications, professional registration, work
            authorisation, disability status, EE designation, and job preferences.
            Your account and login remain active.
          </p>
          <p className="text-sm font-medium">
            This cannot be undone. Type{" "}
            <span className="font-mono">DELETE</span> below to confirm.
          </p>
          <div>
            <label
              htmlFor="delete-data-confirm"
              className="mb-1.5 block text-sm font-medium"
            >
              Confirmation
            </label>
            <input
              id="delete-data-confirm"
              type="text"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder="DELETE"
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
            className="border border-[var(--color-rust)] px-4 py-2 text-sm font-medium text-[var(--color-rust)] hover:bg-[var(--color-rust)] hover:text-[var(--color-paper)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {status === "busy" ? "Deleting…" : "Delete my data"}
          </button>
        </form>
      )}
    </div>
  );
}
