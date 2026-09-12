"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/navigation";
import { useRouter } from "@/lib/navigation";
import { useTranslations } from "next-intl";
import { Eye, EyeOff } from "lucide-react";

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
  const t = useTranslations("Auth");
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
          className="absolute inset-y-0 right-0 flex cursor-pointer items-center px-3 text-[var(--color-muted)] hover:text-[var(--color-ink)]"
          aria-label={show ? t("fields.hidePassword") : t("fields.showPassword")}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </label>
  );
}

export default function ResetPasswordPage() {
  const t = useTranslations("Auth");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpiredError, setIsExpiredError] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsExpiredError(false);

    if (newPassword !== confirmPassword) {
      setError(t("resetPassword.passwordsMismatch"));
      return;
    }
    if (newPassword.length < 6) {
      setError(t("resetPassword.passwordTooShort"));
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      if (error.message.includes("session")) {
        setError(t("resetPassword.expiredError"));
        setIsExpiredError(true);
      } else {
        setError(error.message);
      }
      setLoading(false);
      return;
    }

    setDone(true);
    setLoading(false);
    setTimeout(() => router.push("/auth/login"), 2500);
  }

  if (done) {
    return (
      <main className="w-full max-w-md px-4 py-16 sm:px-6">
        <div className="border border-[var(--color-line)] bg-[var(--color-paper)] p-8 text-center sm:p-10">
          <h1 className="font-display text-2xl font-semibold">
            {t("resetPassword.updatedTitle")}
          </h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            {t("resetPassword.updatedBody")}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full max-w-md px-4 py-16 sm:px-6">
      <div className="border border-[var(--color-line)] bg-[var(--color-paper)] p-8 sm:p-10">
        <h1 className="font-display text-2xl font-semibold">
          {t("resetPassword.title")}
        </h1>
        <p className="mt-1.5 text-sm text-[var(--color-muted)]">
          {t("resetPassword.subtitle")}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <PasswordField
            id="new-password"
            label={t("resetPassword.newPassword")}
            value={newPassword}
            onChange={setNewPassword}
            required
          />
          <PasswordField
            id="confirm-password"
            label={t("resetPassword.confirmNewPassword")}
            value={confirmPassword}
            onChange={setConfirmPassword}
            required
          />

          {error && (
            <div>
              <p className="text-sm text-[var(--color-rust)]">{error}</p>
              {isExpiredError && (
                <Link
                  href="/auth/forgot-password"
                  prefetch={false}
                  className="mt-1 block text-sm font-medium underline underline-offset-2 hover:text-[var(--color-rust)]"
                >
                  {t("resetPassword.requestNewLink")}
                </Link>
              )}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full justify-center"
          >
            {loading ? t("resetPassword.updating") : t("resetPassword.submit")}
          </Button>
        </form>
      </div>
    </main>
  );
}
