"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    // The reset link lands at /auth/callback which exchanges the code for a
    // session and then redirects to /auth/reset-password.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setDone(true);
    setLoading(false);
  }

  if (done) {
    return (
      <main className="mx-auto max-w-sm px-4 py-16 text-center sm:px-6">
        <h1 className="font-display text-2xl">Check your email</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          If an account exists for <strong>{email}</strong>, we&apos;ve sent a
          password reset link. Check your inbox (and spam folder).
        </p>
        <p className="mt-6 text-sm text-[var(--color-muted)]">
          <Link
            href="/auth/login"
            className="text-[var(--color-ink)] underline underline-offset-2 hover:text-[var(--color-rust)]"
          >
            Back to sign in
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-16 sm:px-6">
      <h1 className="font-display text-2xl">Forgot your password?</h1>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        Enter your email address and we&apos;ll send you a reset link.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Email address</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2.5 text-sm"
          />
        </label>

        {error && <p className="text-sm text-[var(--color-rust)]">{error}</p>}

        <Button type="submit" disabled={loading} className="w-full justify-center">
          {loading ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-[var(--color-muted)]">
        Remembered it?{" "}
        <Link
          href="/auth/login"
          className="text-[var(--color-ink)] underline underline-offset-2 hover:text-[var(--color-rust)]"
        >
          Back to sign in
        </Link>
      </p>
    </main>
  );
}
