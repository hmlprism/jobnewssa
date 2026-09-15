"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Link } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { Eye, EyeOff } from "lucide-react";

type ReactivationState = "idle" | "requesting" | "sent";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/jobs";
  const reactivationParam = searchParams.get("reactivation");
  const t = useTranslations("Auth");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deactivated, setDeactivated] = useState(false);
  const [reactivationState, setReactivationState] =
    useState<ReactivationState>("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDeactivated(false);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      if (error.message === "User is banned") {
        setDeactivated(true);
      } else {
        setError(error.message);
      }
      setLoading(false);
      return;
    }
    router.refresh();
    router.push(next.startsWith("/") ? next : "/jobs");
  }

  async function handleRequestReactivation() {
    setReactivationState("requesting");
    try {
      await fetch("/api/account/reactivate/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {
      // Silently ignore network errors — the UI always moves to "sent" state
      // so as not to reveal whether the request reached the server.
    }
    setReactivationState("sent");
  }

  // Deactivated-account panel: shown after a "User is banned" login error.
  if (deactivated) {
    if (reactivationState === "sent") {
      return (
        <main className="w-full max-w-md px-4 py-16 sm:px-6">
          <div className="border border-[var(--color-line)] bg-[var(--color-paper)] p-8 text-center sm:p-10">
            <h1 className="font-display text-2xl font-semibold">
              {t("deactivated.sentTitle")}
            </h1>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              {t("deactivated.sentBody", { email })}
            </p>
          </div>
        </main>
      );
    }

    return (
      <main className="w-full max-w-md px-4 py-16 sm:px-6">
        <div className="border border-[var(--color-line)] bg-[var(--color-paper)] p-8 sm:p-10">
          <h1 className="font-display text-2xl font-semibold">
            {t("deactivated.loginTitle")}
          </h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            {t("deactivated.loginBody")}
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Button
              onClick={handleRequestReactivation}
              disabled={reactivationState === "requesting"}
              className="w-full justify-center"
            >
              {reactivationState === "requesting"
                ? t("deactivated.requesting")
                : t("deactivated.requestButton")}
            </Button>
            <button
              type="button"
              onClick={() => setDeactivated(false)}
              className="cursor-pointer text-sm text-[var(--color-muted)] underline underline-offset-2 hover:text-[var(--color-rust)]"
            >
              {t("login.submit")}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full max-w-md px-4 py-16 sm:px-6">
      <div className="border border-[var(--color-line)] bg-[var(--color-paper)] p-8 sm:p-10">
        <Image
          src="/logo-mark.png"
          alt={t("logoAlt")}
          width={455}
          height={450}
          className="mb-5 h-10 w-auto"
        />
        <h1 className="font-display text-2xl font-semibold">{t("login.title")}</h1>
        <p className="mt-1.5 text-sm text-[var(--color-muted)]">
          {t("login.subtitle")}
        </p>

        {/* Stale reactivation-link notice (from the confirm redirect) */}
        {reactivationParam && reactivationParam !== "success" && (
          <p className="mt-4 text-sm text-[var(--color-clay)]">
            {t("deactivated.linkExpired")}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <Field
            label={t("fields.email")}
            type="email"
            value={email}
            onChange={setEmail}
            required
            autoComplete="email"
          />

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="login-password" className="text-sm font-medium">
                {t("fields.password")}
              </label>
              <Link
                href="/auth/forgot-password"
                prefetch={false}
                className="text-xs text-[var(--color-muted)] hover:text-[var(--color-rust)]"
              >
                {t("login.forgotPassword")}
              </Link>
            </div>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2.5 pr-10 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute inset-y-0 right-0 flex cursor-pointer items-center px-3 text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                aria-label={showPassword ? t("fields.hidePassword") : t("fields.showPassword")}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-[var(--color-rust)]">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full justify-center"
          >
            {loading ? t("login.signingIn") : t("login.submit")}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--color-muted)]">
          {t("login.noAccount")}{" "}
          <Link
            href="/auth/signup"
            prefetch={false}
            className="font-medium text-[var(--color-ink)] underline underline-offset-2 hover:text-[var(--color-rust)]"
          >
            {t("login.createOne")}
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  required,
  autoComplete,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete={autoComplete}
        className="w-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2.5 text-sm"
      />
    </label>
  );
}
