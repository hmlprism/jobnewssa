"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push("/jobs");
    router.refresh();
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-sm px-4 py-16 sm:px-6">
        <h1 className="font-display text-2xl">Sign in</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Welcome back. Search and apply for jobs across South Africa.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <Field label="Email" type="email" value={email} onChange={setEmail} required />
          <Field label="Password" type="password" value={password} onChange={setPassword} required />

          {error && <p className="text-sm text-[var(--color-rust)]">{error}</p>}

          <Button type="submit" disabled={loading} className="w-full justify-center">
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-sm text-[var(--color-muted)]">
          Don&apos;t have an account?{" "}
          <Link href="/auth/signup" className="text-[var(--color-rust)] hover:underline">
            Create one
          </Link>
        </p>
      </main>
    </>
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
