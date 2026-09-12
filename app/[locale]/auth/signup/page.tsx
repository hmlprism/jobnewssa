"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Link } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { Eye, EyeOff } from "lucide-react";
import type { UserRole } from "@/types/database";

function PasswordField({
  label,
  value,
  onChange,
  required,
  minLength,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  const t = useTranslations("Auth");
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          className="w-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2.5 pr-10 text-sm"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute inset-y-0 right-0 flex cursor-pointer items-center px-3 text-[var(--color-muted)] hover:text-[var(--color-ink)]"
          aria-label={show ? t("fields.hidePassword") : t("fields.showPassword")}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </label>
  );
}

export default function SignupPage() {
  const t = useTranslations("Auth");
  const [role, setRole] = useState<UserRole>("job_seeker");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [consented, setConsented] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [accountExists, setAccountExists] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setConfirmError(t("signup.passwordsMismatch"));
      return;
    }
    setConfirmError(null);

    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role, consented_at: new Date().toISOString() },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    if (!data.user || data.user.identities?.length === 0) {
      // Supabase returns either user: null OR a fake user with identities: [] when the
      // email already belongs to a confirmed account (anti-enumeration). No confirmation
      // email is sent in either case.
      setAccountExists(true);
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
            {t("signup.emailSentTitle")}
          </h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            {t("signup.emailSentBody", { email })}
          </p>
        </div>
      </main>
    );
  }

  if (accountExists) {
    return (
      <main className="w-full max-w-md px-4 py-16 sm:px-6">
        <div className="border border-[var(--color-line)] bg-[var(--color-paper)] p-8 text-center sm:p-10">
          <h1 className="font-display text-2xl font-semibold">
            {t("signup.accountExistsTitle")}
          </h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            {t.rich("signup.accountExistsBody", {
              bold: (chunks) => (
                <strong className="font-medium text-[var(--color-ink)]">{chunks}</strong>
              ),
              email,
            })}
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href="/auth/login"
              prefetch={false}
              className="block border border-[var(--color-ink)] bg-[var(--color-ink)] px-4 py-2.5 text-sm font-medium text-[var(--color-paper)] hover:bg-[var(--color-ink)]/90"
            >
              {t("signup.signIn")}
            </Link>
            <Link
              href="/auth/forgot-password"
              prefetch={false}
              className="text-sm text-[var(--color-muted)] underline underline-offset-2 hover:text-[var(--color-rust)]"
            >
              {t("signup.forgotPassword")}
            </Link>
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
        <h1 className="font-display text-2xl font-semibold">
          {t("signup.title")}
        </h1>
        <p className="mt-1.5 text-sm text-[var(--color-muted)]">
          {t("signup.subtitle")}
        </p>

        {/* Role selector */}
        <div className="mt-6 grid grid-cols-2 gap-2">
          <RoleButton
            active={role === "job_seeker"}
            onClick={() => setRole("job_seeker")}
            label={t("signup.roleSeeker")}
          />
          <RoleButton
            active={role === "employer"}
            onClick={() => setRole("employer")}
            label={t("signup.roleEmployer")}
          />
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Field
            label={t("fields.fullName")}
            type="text"
            value={fullName}
            onChange={setFullName}
            required
            autoComplete="name"
          />
          <Field
            label={t("fields.email")}
            type="email"
            value={email}
            onChange={setEmail}
            required
            autoComplete="email"
          />
          <PasswordField
            label={t("fields.password")}
            value={password}
            onChange={setPassword}
            required
            minLength={6}
            autoComplete="new-password"
          />
          <div>
            <PasswordField
              label={t("fields.confirmPassword")}
              value={confirmPassword}
              onChange={(v) => {
                setConfirmPassword(v);
                if (confirmError) setConfirmError(null);
              }}
              required
              autoComplete="new-password"
            />
            {confirmError && (
              <p className="mt-1 text-sm text-[var(--color-rust)]">
                {confirmError}
              </p>
            )}
          </div>

          <div className="flex items-start gap-2.5 pt-1">
            <input
              type="checkbox"
              id="consent"
              checked={consented}
              onChange={(e) => setConsented(e.target.checked)}
              required
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[var(--color-ink)]"
            />
            <label
              htmlFor="consent"
              className="text-sm text-[var(--color-ink)]"
            >
              {t.rich("signup.consent", {
                terms: (chunks) => (
                  <Link
                    href="/terms"
                    prefetch={false}
                    className="font-medium underline underline-offset-2 hover:text-[var(--color-rust)]"
                  >
                    {chunks}
                  </Link>
                ),
                privacy: (chunks) => (
                  <Link
                    href="/privacy"
                    prefetch={false}
                    className="font-medium underline underline-offset-2 hover:text-[var(--color-rust)]"
                  >
                    {chunks}
                  </Link>
                ),
              })}
            </label>
          </div>

          {error && (
            <p className="text-sm text-[var(--color-rust)]">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full justify-center"
          >
            {loading ? t("signup.creating") : t("signup.submit")}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--color-muted)]">
          {t("signup.alreadyHaveAccount")}{" "}
          <Link
            href="/auth/login"
            prefetch={false}
            className="font-medium text-[var(--color-ink)] underline underline-offset-2 hover:text-[var(--color-rust)]"
          >
            {t("signup.signIn")}
          </Link>
        </p>
      </div>
    </main>
  );
}

function RoleButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer border px-3 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)]"
          : "border-[var(--color-line)] text-[var(--color-ink)] hover:border-[var(--color-ink)]"
      }`}
    >
      {label}
    </button>
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
