"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { SiteFooter } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  SA_PROVINCES,
  CONTRACT_TYPE_LABELS,
  type ContractType,
  type Sector,
} from "@/types/database";

const NQF_LEVELS = [
  { value: "1", label: "Level 1: Grade 9" },
  { value: "2", label: "Level 2: Grade 10" },
  { value: "3", label: "Level 3: Grade 11" },
  { value: "4", label: "Level 4: National Senior Certificate (Matric)" },
  { value: "5", label: "Level 5: Higher Certificate" },
  { value: "6", label: "Level 6: Diploma / Advanced Certificate" },
  { value: "7", label: "Level 7: Bachelor's Degree / Advanced Diploma" },
  { value: "8", label: "Level 8: Honours / Postgraduate Diploma" },
  { value: "9", label: "Level 9: Master's Degree" },
  { value: "10", label: "Level 10: Doctoral Degree" },
];

const QUALIFICATION_TYPES = [
  "Certificate",
  "Higher Certificate",
  "Diploma",
  "Advanced Certificate",
  "Advanced Diploma",
  "Bachelor's Degree",
  "Bachelor Honours Degree",
  "Postgraduate Diploma",
  "Professional Degree",
  "Master's Degree",
  "Doctoral Degree",
  "Other",
];
import { slugify } from "@/lib/slug";

const inputClass =
  "w-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2.5 text-sm";

export default function PostJobPage() {
  const router = useRouter();
  const [authState, setAuthState] = useState<
    "loading" | "signed_out" | "wrong_role" | "ready"
  >("loading");
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

  const [eeNote, setEeNote] = useState("");
  const [accommodationContact, setAccommodationContact] = useState("");
  const [requiredNqfLevel, setRequiredNqfLevel] = useState("");
  const [requiredQualificationType, setRequiredQualificationType] =
    useState("");

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
      salary_min: marketRelated
        ? null
        : salaryMin
          ? parseInt(salaryMin, 10)
          : null,
      salary_max: marketRelated
        ? null
        : salaryMax
          ? parseInt(salaryMax, 10)
          : null,
      salary_is_market_related: marketRelated,
      source: "employer_direct",
      status: "published",
      posted_at: new Date().toISOString(),
      expires_at: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
      employment_equity_note: eeNote || null,
      accommodation_contact: accommodationContact || null,
      required_nqf_level: requiredNqfLevel || null,
      required_qualification_type: requiredQualificationType || null,
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
        <h1 className="font-display text-2xl font-semibold">
          Sign in to post a job
        </h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          You need an employer account to post vacancies.
        </p>
        <Link
          href="/auth/signup"
          prefetch={false}
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
        <h1 className="font-display text-2xl font-semibold">
          Employer account required
        </h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Your account is registered as a job seeker. Contact support to switch
          to an employer account.
        </p>
      </main>
    );
  }

  if (success) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <h1 className="font-display text-2xl font-semibold">Job posted</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Your vacancy is live. Redirecting to your dashboard…
        </p>
      </main>
    );
  }

  return (
    <>
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-12">
        <h1 className="font-display text-2xl font-semibold">Post a job</h1>
        <p className="mt-1.5 text-sm text-[var(--color-muted)]">
          Free to post. Live immediately, expires after 30 days.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {/* Section: Basic details */}
          <fieldset className="space-y-4">
            <legend className="mb-3 border-b border-[var(--color-line)] pb-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
              Job details
            </legend>
            <Field
              label="Company name"
              value={companyName}
              onChange={setCompanyName}
              required
            />
            <Field
              label="Job title"
              value={title}
              onChange={setTitle}
              required
            />
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">
                Job description
              </span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={8}
                className={`${inputClass} p-3`}
                placeholder="Responsibilities, requirements, how to apply..."
              />
            </label>
          </fieldset>

          {/* Section: Location */}
          <fieldset className="space-y-4">
            <legend className="mb-3 border-b border-[var(--color-line)] pb-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
              Location
            </legend>
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">
                  Province
                </span>
                <select
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className={inputClass}
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
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isRemote}
                onChange={(e) => setIsRemote(e.target.checked)}
              />
              This is a remote position
            </label>
          </fieldset>

          {/* Section: Classification */}
          <fieldset className="space-y-4">
            <legend className="mb-3 border-b border-[var(--color-line)] pb-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
              Classification & salary
            </legend>
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">
                  Contract type
                </span>
                <select
                  value={contractType}
                  onChange={(e) =>
                    setContractType(e.target.value as ContractType)
                  }
                  className={inputClass}
                >
                  {(Object.keys(CONTRACT_TYPE_LABELS) as ContractType[]).map(
                    (ct) => (
                      <option key={ct} value={ct}>
                        {CONTRACT_TYPE_LABELS[ct]}
                      </option>
                    )
                  )}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">
                  Sector
                </span>
                <select
                  value={sectorId}
                  onChange={(e) => setSectorId(e.target.value)}
                  className={inputClass}
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

            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={marketRelated}
                onChange={(e) => setMarketRelated(e.target.checked)}
              />
              Salary is market related (don&apos;t specify a figure)
            </label>

            {!marketRelated && (
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Min salary (R/month)"
                  type="number"
                  value={salaryMin}
                  onChange={setSalaryMin}
                />
                <Field
                  label="Max salary (R/month)"
                  type="number"
                  value={salaryMax}
                  onChange={setSalaryMax}
                />
              </div>
            )}
          </fieldset>

          {/* Section: Requirements */}
          <fieldset className="space-y-4">
            <legend className="mb-3 border-b border-[var(--color-line)] pb-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
              Requirements{" "}
              <span className="font-normal normal-case tracking-normal">
                (optional)
              </span>
            </legend>
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">
                  Min. NQF level required
                </span>
                <select
                  value={requiredNqfLevel}
                  onChange={(e) => setRequiredNqfLevel(e.target.value)}
                  className={inputClass}
                >
                  <option value="">No minimum</option>
                  {NQF_LEVELS.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">
                  Required qualification type
                </span>
                <select
                  value={requiredQualificationType}
                  onChange={(e) =>
                    setRequiredQualificationType(e.target.value)
                  }
                  className={inputClass}
                >
                  <option value="">No specific requirement</option>
                  {QUALIFICATION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </fieldset>

          {/* Section: EE & accessibility */}
          <fieldset className="space-y-4">
            <legend className="mb-3 border-b border-[var(--color-line)] pb-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
              Equity & accessibility{" "}
              <span className="font-normal normal-case tracking-normal">
                (optional)
              </span>
            </legend>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">
                Employment Equity / Affirmative Action statement
              </span>
              <textarea
                value={eeNote}
                onChange={(e) => setEeNote(e.target.value)}
                rows={3}
                className={`${inputClass} p-3`}
                placeholder="e.g. Preference will be given to candidates from designated groups as defined in the Employment Equity Act."
              />
            </label>
            <Field
              label="Accessibility accommodation contact"
              value={accommodationContact}
              onChange={setAccommodationContact}
            />
          </fieldset>

          {error && (
            <p className="text-sm text-[var(--color-rust)]">{error}</p>
          )}

          <Button
            type="submit"
            disabled={submitting}
            size="lg"
            className="w-full justify-center"
          >
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
        className={inputClass}
      />
    </label>
  );
}
