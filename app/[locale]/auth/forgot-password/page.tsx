"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/navigation";
import { useTranslations } from "next-intl";

export default function ForgotPasswordPage() {
  const t = useTranslations("Auth");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
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
      <main className="w-full max-w-md px-4 py-16 sm:px-6">
        <div className="border border-[var(--color-line)] bg-[var(--color-paper)] p-8 text-center sm:p-10">
          <h1 className="font-display text-2xl font-semibold">
            {t("forgotPassword.emailSentTitle")}
          </h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            {t.rich("forgotPassword.emailSentBody", {
              bold: (chunks) => <strong>{chunks}</strong>,
              email,
            })}
          </p>
          <p className="mt-6 text-sm">
            <Link
              href="/auth/login"
              prefetch={false}
              className="font-medium text-[var(--color-ink)] underline underline-offset-2 hover:text-[var(--color-rust)]"
            >
              {t("forgotPassword.backToSignIn")}
            </Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full max-w-md px-4 py-16 sm:px-6">
      <div className="border border-[var(--color-line)] bg-[var(--color-paper)] p-8 sm:p-10">
        <h1 className="font-display text-2xl font-semibold">
          {t("forgotPassword.title")}
        </h1>
        <p className="mt-1.5 text-sm text-[var(--color-muted)]">
          {t("forgotPassword.subtitle")}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">
              {t("fields.emailAddress")}
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2.5 text-sm"
            />
          </label>

          {error && (
            <p className="text-sm text-[var(--color-rust)]">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full justify-center"
          >
            {loading ? t("forgotPassword.sending") : t("forgotPassword.submit")}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--color-muted)]">
          {t("forgotPassword.remembered")}{" "}
          <Link
            href="/auth/login"
            prefetch={false}
            className="font-medium text-[var(--color-ink)] underline underline-offset-2 hover:text-[var(--color-rust)]"
          >
            {t("forgotPassword.backToSignIn")}
          </Link>
        </p>
      </div>
    </main>
  );
}
