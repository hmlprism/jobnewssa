"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/types/database";

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
  label,
  value,
  onChange,
  required,
  minLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  minLength?: number;
}) {
  const [show, setShow] = useState(false);
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

export default function SignupPage() {
  const [role, setRole] = useState<UserRole>("job_seeker");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setConfirmError("Passwords don't match.");
      return;
    }
    setConfirmError(null);

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
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
          We&apos;ve sent a confirmation link to {email}. Click it to activate your account.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-16 sm:px-6">
      <h1 className="font-display text-2xl">Create your account</h1>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        Free for job seekers and employers.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-2">
        <RoleButton
          active={role === "job_seeker"}
          onClick={() => setRole("job_seeker")}
          label="I'm looking for work"
        />
        <RoleButton
          active={role === "employer"}
          onClick={() => setRole("employer")}
          label="I'm hiring"
        />
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Field label="Full name" type="text" value={fullName} onChange={setFullName} required />
        <Field label="Email" type="email" value={email} onChange={setEmail} required />
        <PasswordField
          label="Password"
          value={password}
          onChange={setPassword}
          required
          minLength={6}
        />
        <div>
          <PasswordField
            label="Confirm password"
            value={confirmPassword}
            onChange={(v) => {
              setConfirmPassword(v);
              if (confirmError) setConfirmError(null);
            }}
            required
          />
          {confirmError && (
            <p className="mt-1 text-sm text-[var(--color-rust)]">{confirmError}</p>
          )}
        </div>

        {error && <p className="text-sm text-[var(--color-rust)]">{error}</p>}

        <Button type="submit" disabled={loading} className="w-full justify-center">
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-[var(--color-muted)]">
        Already have an account?{" "}
        <Link href="/auth/login" className="text-[var(--color-ink)] underline underline-offset-2 hover:text-[var(--color-rust)]">
          Sign in
        </Link>
      </p>
    </main>
  );
}

function RoleButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer border px-3 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)]"
          : "border-[var(--color-line)] hover:border-[var(--color-ink)]"
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
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2.5 text-sm"
      />
    </label>
  );
}
