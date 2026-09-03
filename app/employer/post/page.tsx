"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { SiteFooter } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SA_PROVINCES, CONTRACT_TYPE_LABELS, type ContractType, type Sector } from "@/types/database";
import { slugify } from "@/lib/slug";

export default function PostJobPage() {
  const router = useRouter();
  const [authState, setAuthState] = useState<"loading" | "signed_out" | "wrong_role" | "ready">("loading");
  const [sectors, setSectors] = useState<Sector[]>([]);

  const [companyName, setCompanyName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [province, setProvince] = useState<string>(SA_PROVINCES[0]);
  const [city, setCity] = useState("");
  const [isRemote, setIsRemote] = useState(false);
  const [contractType, setContractType] = useState<ContractType>("permanent");
  const [sectorId, setSectorId] = useState<string>("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [marketRelated, setMarketRelated] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.auth.getUser(),
      supabase.from("sectors").select("*").order("name"),
    ]).then(([{ data: { user } }, { data: sectorData }]) => {
      setSectors(sectorData ?? []);
      if (!user) {
        setAuthState("signed_out");
        return;
      }
      supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()
        .then(({ data: profile }) => {
          if (profile?.role === "employer" || profile?.role === "admin") {
            setAuthState("ready");
          } else {
            setAuthState("wrong_role");
          }
        });
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("You must be signed in.");
      setSubmitting(false);
      return;
    }

    // Find or create the employer's company record
    let companyId: string | null = null;
    const { data: existingCompany } = await supabase
      .from("companies")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (existingCompany) {
      companyId = existingCompany.id;
    } else {
      const { data: newCompany, error: companyError } = await supabase
        .from("companies")
        .insert({
          owner_id: user.id,
          name: companyName,
          slug: `${slugify(companyName)}-${user.id.slice(0, 6)}`,
        })
        .select("id")
        .single();
      if (companyError) {
        setError(companyError.message);
        setSubmitting(false);
        return;
      }
      companyId = newCompany.id;
    }

    const jobId = crypto.randomUUID();
    const { error: jobError } = await supabase.from("jobs").insert({
      id: jobId,
      company_id: companyId,
      company_name_raw: companyName,
      posted_by: user.id,
      title,
      slug: `${slugify(title)}-${slugify(city || province)}-${jobId.slice(0, 8)}`,
      description,
      sector_id: sectorId ? parseInt(sectorId, 10) : null,
      province,
      city: city || null,
      is_remote: isRemote,
      contract_type: contractType,
      salary_min: marketRelated ? null : salaryMin ? parseInt(salaryMin, 10) : null,
      salary_max: marketRelated ? null : salaryMax ? parseInt(salaryMax, 10) : null,
      salary_is_market_related: marketRelated,
      source: "employer_direct",
      status: "published",
      posted_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    if (jobError) {
      setError(jobError.message);
      setSubmitting(false);
      return;
    }

    setSuccess(true);
    setSubmitting(false);
    setTimeout(() => router.push("/employer/dashboard"), 1500);
  }

  if (authState === "loading") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="h-40 animate-pulse bg-[var(--color-paper-dim)]" />
      </main>
    );
  }

  if (authState === "signed_out") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <h1 className="font-display text-2xl">Sign in to post a job</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          You need an employer account to post vacancies.
        </p>
        <Link
          href="/auth/signup"
          className="mt-6 inline-flex bg-[var(--color-rust)] px-6 py-3 text-sm font-medium text-[var(--color-paper)] hover:bg-[var(--color-rust-dark)]"
        >
          Create employer account
        </Link>
      </main>
    );
  }

  if (authState === "wrong_role") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <h1 className="font-display text-2xl">Employer account required</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Your account is registered as a job seeker. Contact support to switch to an employer account.
        </p>
      </main>
    );
  }

  if (success) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <h1 className="font-display text-2xl">Job posted</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Your vacancy is live. Redirecting to your dashboard…
        </p>
      </main>
    );
  }

  return (
    <>
      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-2xl">Post a job</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Free to post. Live immediately, expires after 30 days.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <Field label="Company name" value={companyName} onChange={setCompanyName} required />
          <Field label="Job title" value={title} onChange={setTitle} required />

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Job description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={8}
              className="w-full border border-[var(--color-line)] bg-[var(--color-paper)] p-3 text-sm"
              placeholder="Responsibilities, requirements, how to apply..."
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Province</span>
              <select
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="w-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2.5 text-sm"
              >
                {SA_PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <Field label="City / town" value={city} onChange={setCity} />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isRemote}
              onChange={(e) => setIsRemote(e.target.checked)}
              className="accent-[var(--color-rust)]"
            />
            This is a remote position
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Contract type</span>
              <select
                value={contractType}
                onChange={(e) => setContractType(e.target.value as ContractType)}
                className="w-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2.5 text-sm"
              >
                {(Object.keys(CONTRACT_TYPE_LABELS) as ContractType[]).map((ct) => (
                  <option key={ct} value={ct}>
                    {CONTRACT_TYPE_LABELS[ct]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Sector</span>
              <select
                value={sectorId}
                onChange={(e) => setSectorId(e.target.value)}
                className="w-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2.5 text-sm"
              >
                <option value="">Select sector</option>
                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={marketRelated}
              onChange={(e) => setMarketRelated(e.target.checked)}
              className="accent-[var(--color-rust)]"
            />
            Salary is market related (don&apos;t specify a figure)
          </label>

          {!marketRelated && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Min salary (R/month)" type="number" value={salaryMin} onChange={setSalaryMin} />
              <Field label="Max salary (R/month)" type="number" value={salaryMax} onChange={setSalaryMax} />
            </div>
          )}

          {error && <p className="text-sm text-[var(--color-rust)]">{error}</p>}

          <Button type="submit" disabled={submitting} className="w-full justify-center">
            {submitting ? "Posting…" : "Post job"}
          </Button>
        </form>
      </main>
      <SiteFooter />
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
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
