"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          minLength={6}
          className="w-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2.5 pr-10 text-sm"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-[var(--color-muted)] hover:text-[var(--color-ink)]"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </label>
  );
}

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      // "Auth session missing" means the reset link has expired or already been used.
      setError(
        error.message.includes("session")
          ? "This reset link has expired or already been used. Request a new one."
          : error.message
      );
      setLoading(false);
      return;
    }

    setDone(true);
    setLoading(false);
    // Give the user a moment to read the success message, then redirect.
    setTimeout(() => router.push("/auth/login"), 2500);
  }

  if (done) {
    return (
      <main className="mx-auto max-w-sm px-4 py-16 text-center sm:px-6">
        <h1 className="font-display text-2xl">Password updated</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Your password has been changed. Redirecting you to sign in…
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-16 sm:px-6">
      <h1 className="font-display text-2xl">Set a new password</h1>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        Choose a new password for your account.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <PasswordField
          id="new-password"
          label="New password"
          value={newPassword}
          onChange={setNewPassword}
          required
        />
        <PasswordField
          id="confirm-password"
          label="Confirm new password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          required
        />

        {error && (
          <div>
            <p className="text-sm text-[var(--color-rust)]">{error}</p>
            {error.includes("expired") && (
              <Link
                href="/auth/forgot-password"
                className="mt-1 block text-sm underline underline-offset-2 hover:text-[var(--color-rust)]"
              >
                Request a new reset link
              </Link>
            )}
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full justify-center">
          {loading ? "Updating…" : "Set new password"}
        </Button>
      </form>
    </main>
  );
}
