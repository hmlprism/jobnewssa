"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { SiteFooter } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Company } from "@/types/database";

type PageState = "loading" | "no_access" | "no_company" | "verified" | "unverified";

export default function EmployerVerifyPage() {
  const [pageState, setPageState] = useState<PageState>("loading");
  const [company, setCompany] = useState<Company | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setPageState("no_access");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile?.role !== "employer" && profile?.role !== "admin") {
        setPageState("no_access");
        return;
      }
      const { data: co } = await supabase
        .from("companies")
        .select("id, name, website, verified, verification_method, verified_at, owner_id, slug, logo_url, description, province, city, created_at")
        .eq("owner_id", user.id)
        .maybeSingle();
      if (!co) {
        setPageState("no_company");
        return;
      }
      setCompany(co as Company);
      setWebsiteUrl(co.website ?? "");
      setPageState(co.verified ? "verified" : "unverified");
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/employer/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteUrl }),
      });
      const json = await res.json();
      if (json.verified) {
        setPageState("verified");
        setResult({ ok: true, message: "Your employer account is now verified." });
      } else {
        setResult({ ok: false, message: json.message ?? json.error ?? "Verification failed." });
      }
    } catch {
      setResult({ ok: false, message: "Something went wrong. Try again." });
    } finally {
      setSubmitting(false);
    }
  }

  if (pageState === "loading") {
    return (
      <>
        <main className="mx-auto max-w-lg px-4 py-16 sm:px-6">
          <div className="h-40 animate-pulse bg-[var(--color-paper-dim)]" />
        </main>
        <SiteFooter />
      </>
    );
  }

  if (pageState === "no_access") {
    return (
      <>
        <main className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
          <h1 className="font-display text-2xl">Employer account required</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Sign in with an employer account to verify your company.
          </p>
          <Link href="/auth/login" className="mt-6 inline-block text-sm text-[var(--color-rust)] underline">
            Sign in
          </Link>
        </main>
        <SiteFooter />
      </>
    );
  }

  if (pageState === "no_company") {
    return (
      <>
        <main className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
          <h1 className="font-display text-2xl">Post a job first</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Your company profile is created when you post your first job.
          </p>
          <Link href="/employer/post" className="mt-6 inline-block text-sm text-[var(--color-rust)] underline">
            Post a vacancy
          </Link>
        </main>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <main className="mx-auto max-w-lg px-4 py-12 sm:px-6">
        <Link
          href="/employer/dashboard"
          className="mb-6 inline-block text-sm text-[var(--color-muted)] hover:text-[var(--color-rust)]"
        >
          ← Back to dashboard
        </Link>

        <h1 className="font-display text-2xl">Verify your employer account</h1>

        {pageState === "verified" ? (
          <div className="mt-6 border border-[var(--color-indigo)] bg-[var(--color-indigo-dim)] px-4 py-4 text-sm text-[var(--color-indigo)]">
            <p className="font-medium">✓ Your account is verified</p>
            <p className="mt-1">
              Your jobs display a verified badge.
              {company?.verified_at && (
                <> Verified on {new Date(company.verified_at).toLocaleDateString("en-ZA")}.</>
              )}
            </p>
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              We check that your account email domain matches your company website. If they match,
              your account is verified instantly and your jobs show a verified badge.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Company website URL</span>
                <input
                  type="text"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  required
                  placeholder="https://yourcompany.co.za"
                  className="w-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2.5 text-sm"
                />
                <p className="mt-1.5 text-xs text-[var(--color-muted)]">
                  Must match your account email domain — e.g. if your email is{" "}
                  <em>you@acme.co.za</em>, enter <em>acme.co.za</em>.
                </p>
              </label>

              {result && (
                <div
                  className={`border px-3 py-2.5 text-sm ${
                    result.ok
                      ? "border-[var(--color-indigo)] bg-[var(--color-indigo-dim)] text-[var(--color-indigo)]"
                      : "border-[var(--color-clay)] bg-[var(--color-clay-dim)] text-[var(--color-ink)]"
                  }`}
                >
                  {result.message}
                </div>
              )}

              <Button type="submit" disabled={submitting} className="w-full justify-center">
                {submitting ? "Checking…" : "Verify now"}
              </Button>
            </form>
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
