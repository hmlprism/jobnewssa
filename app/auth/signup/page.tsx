"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/types/database";

export default function SignupPage() {
  const [role, setRole] = useState<UserRole>("job_seeker");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
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
      <main className="mx-auto max-w-sm px-4 py-16 sm:px-6 text-center">
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
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            required
            minLength={6}
          />

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
  minLength,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        className="w-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2.5 text-sm"
      />
    </label>
  );
}
