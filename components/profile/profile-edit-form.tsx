"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { SA_PROVINCES, CONTRACT_TYPE_LABELS, type Profile, type ContractType } from "@/types/database";

const NQF_LEVELS = [
  { value: "1", label: "Level 1 — Grade 9" },
  { value: "2", label: "Level 2 — Grade 10" },
  { value: "3", label: "Level 3 — Grade 11" },
  { value: "4", label: "Level 4 — National Senior Certificate (Matric)" },
  { value: "5", label: "Level 5 — Higher Certificate" },
  { value: "6", label: "Level 6 — Diploma / Advanced Certificate" },
  { value: "7", label: "Level 7 — Bachelor's Degree / Advanced Diploma" },
  { value: "8", label: "Level 8 — Honours / Postgraduate Diploma" },
  { value: "9", label: "Level 9 — Master's Degree" },
  { value: "10", label: "Level 10 — Doctoral Degree" },
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

const WORK_AUTHORIZATION_LABELS: Record<string, string> = {
  citizen: "South African Citizen",
  permanent_resident: "Permanent Resident",
  work_permit: "Work Permit Holder",
  other: "Other",
};

// Major South African cities and towns, organised for datalist autocomplete.
const SA_CITIES = [
  // Gauteng
  "Johannesburg", "Pretoria", "Tshwane", "Centurion", "Sandton", "Soweto",
  "Midrand", "Roodepoort", "Krugersdorp", "Germiston", "Benoni", "Boksburg",
  "Alberton", "Kempton Park", "Ekurhuleni", "Springs", "Vereeniging", "Vanderbijlpark",
  // Western Cape
  "Cape Town", "George", "Stellenbosch", "Paarl", "Worcester", "Knysna",
  "Mossel Bay", "Hermanus", "Bellville", "Somerset West", "Malmesbury", "Strand",
  // KwaZulu-Natal
  "Durban", "Pietermaritzburg", "Richards Bay", "Newcastle", "Pinetown",
  "Umhlanga", "Ballito", "Port Shepstone", "Ladysmith", "Tongaat",
  // Eastern Cape
  "Gqeberha", "East London", "Mthatha", "Queenstown", "King William's Town",
  "Makhanda", "Bhisho", "Butterworth", "Port Alfred",
  // Limpopo
  "Polokwane", "Tzaneen", "Thohoyandou", "Mokopane", "Giyani", "Bela-Bela",
  // Mpumalanga
  "Mbombela", "eMalahleni", "Secunda", "Middelburg", "Standerton",
  "Piet Retief", "White River",
  // North West
  "Rustenburg", "Klerksdorp", "Potchefstroom", "Mahikeng", "Brits", "Hartbeespoort",
  // Free State
  "Bloemfontein", "Welkom", "Phuthaditjhaba", "Sasolburg", "Kroonstad", "Bethlehem",
  // Northern Cape
  "Kimberley", "Upington", "Springbok", "De Aar", "Kuruman",
];

/**
 * Validates a South African phone number.
 * Accepts: 0XXXXXXXXX (10 digits, starting with 0)
 *       or +27XXXXXXXXX (+27 followed by exactly 9 digits)
 * Spaces, hyphens, and parentheses in the original input are ignored.
 * Returns null if valid, or an error string if not.
 */
function validatePhone(value: string): string | null {
  if (!value.trim()) return null; // optional field
  if (/[a-zA-Z]/.test(value)) return "Phone number must contain digits only.";
  // Strip common formatting characters before checking the digit pattern
  const stripped = value.replace(/[\s\-().]/g, "");
  if (/^\+27[0-9]{9}$/.test(stripped)) return null;
  if (/^0[0-9]{9}$/.test(stripped)) return null;
  return "Enter a valid South African phone number — 10 digits starting with 0 (e.g. 082 123 4567), or international format (e.g. +27 82 123 4567).";
}

/**
 * Basic format validation for professional registration numbers.
 * Only validates when a known body prefix is detected; accepts all other input.
 * Returns null if valid/unrecognised, or an error string.
 */
function validateProfReg(value: string): string | null {
  if (!value.trim()) return null;
  const upper = value.toUpperCase().trim();

  if (upper.startsWith("SAICA")) {
    const digits = value.replace(/[^0-9]/g, "");
    if (digits.length > 0 && digits.length !== 8) {
      return "SAICA membership numbers are 8 digits (e.g. SAICA: 12345678).";
    }
  }

  if (upper.startsWith("ECSA")) {
    const rest = value.replace(/^ECSA[:\s]*/i, "").trim();
    if (rest && !/^[0-9]+$/.test(rest)) {
      return "ECSA registration numbers are numeric (e.g. ECSA: 123456).";
    }
  }

  if (upper.startsWith("SACAP")) {
    const rest = value.replace(/^SACAP[:\s]*/i, "").trim();
    if (rest && !/^[A-Z0-9/\-]+$/i.test(rest)) {
      return "Check your SACAP number format (e.g. SACAP: 12345).";
    }
  }

  // HPCSA formats vary widely per professional board — accept any non-empty suffix
  if (upper.startsWith("HPCSA")) {
    const rest = value.replace(/^HPCSA[:\s]*/i, "").trim();
    if (!rest) return "Please include your HPCSA registration number after the prefix.";
  }

  return null;
}

const inputClass =
  "w-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="border-b border-[var(--color-line)] pb-2 font-display text-base">
      {children}
    </h2>
  );
}

function PrivateBadge() {
  return (
    <span className="ml-2 text-xs font-normal text-[var(--color-muted)]">
      Private — only visible to you
    </span>
  );
}

export function ProfileEditForm({
  profile,
  userId,
}: {
  profile: Profile;
  userId: string;
}) {
  const isEmployer = profile.role === "employer";

  // Basic info
  const [headline, setHeadline] = useState(profile.headline ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [province, setProvince] = useState(profile.province ?? "");
  const [city, setCity] = useState(profile.city ?? "");

  // Resume (job seekers only)
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [hasResume, setHasResume] = useState(!!profile.resume_url);
  const [resumePath, setResumePath] = useState(profile.resume_url);
  const [viewingResume, setViewingResume] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Qualifications
  const [nqfLevel, setNqfLevel] = useState(profile.nqf_level ?? "");
  const [qualificationTitle, setQualificationTitle] = useState(profile.qualification_title ?? "");
  const [qualificationType, setQualificationType] = useState(profile.qualification_type ?? "");
  const [professionalRegistration, setProfessionalRegistration] = useState(
    profile.professional_registration ?? ""
  );
  const [profRegError, setProfRegError] = useState<string | null>(null);

  // Work authorisation
  const [workAuthorization, setWorkAuthorization] = useState(profile.work_authorization ?? "");

  // Preferences
  const [preferredProvince, setPreferredProvince] = useState(profile.preferred_province ?? "");
  const [preferredContractType, setPreferredContractType] = useState(
    profile.preferred_contract_type ?? ""
  );
  const [desiredSalaryMin, setDesiredSalaryMin] = useState(
    profile.desired_salary_min != null ? String(profile.desired_salary_min) : ""
  );

  // Private EE fields
  const [disabilityStatus, setDisabilityStatus] = useState(profile.disability_status ?? "");
  const [eeDesignation, setEeDesignation] = useState(profile.ee_designation ?? "");

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleViewResume() {
    if (!resumePath) return;
    setViewingResume(true);
    const supabase = createClient();
    const { data } = await supabase.storage
      .from("resumes")
      .createSignedUrl(resumePath, 60);
    setViewingResume(false);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Run field validations before sending to server
    const phoneErr = validatePhone(phone);
    const profRegErr = validateProfReg(professionalRegistration);
    setPhoneError(phoneErr);
    setProfRegError(profRegErr);
    if (phoneErr || profRegErr) {
      setError("Please fix the errors above before saving.");
      setSaveStatus("error");
      return;
    }

    setSaveStatus("saving");
    setError(null);

    const supabase = createClient();
    let resume_url = profile.resume_url;

    // Resume upload — job seekers only
    if (!isEmployer && resumeFile) {
      const path = `${userId}/${Date.now()}_${resumeFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(path, resumeFile, { upsert: true });

      if (uploadError) {
        setError(uploadError.message);
        setSaveStatus("error");
        return;
      }
      resume_url = path;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        headline: headline || null,
        phone: phone || null,
        province: province || null,
        city: city || null,
        // Only update resume_url for job seekers; employers have no resume
        ...(!isEmployer ? { resume_url } : {}),
        nqf_level: nqfLevel || null,
        qualification_title: qualificationTitle || null,
        qualification_type: qualificationType || null,
        professional_registration: professionalRegistration || null,
        work_authorization: workAuthorization || null,
        preferred_province: preferredProvince || null,
        preferred_contract_type: (preferredContractType as ContractType) || null,
        desired_salary_min: desiredSalaryMin ? Number(desiredSalaryMin) : null,
        disability_status: disabilityStatus || null,
        ee_designation: eeDesignation || null,
      })
      .eq("id", userId);

    if (updateError) {
      setError(updateError.message);
      setSaveStatus("error");
      return;
    }

    if (!isEmployer && resumeFile) {
      setHasResume(true);
      setResumePath(resume_url);
    }
    setSaveStatus("saved");
    setResumeFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* ── Resume (job seekers only) ── */}
      {!isEmployer && (
        <div className="space-y-4">
          <SectionHeading>Resume</SectionHeading>
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Resume{" "}
              <span className="font-normal text-[var(--color-muted)]">(PDF, max 5 MB)</span>
            </label>
            {hasResume && (
              <div className="mb-3 flex items-center gap-3">
                <p className="text-sm text-[var(--color-green)]">Resume on file</p>
                <button
                  type="button"
                  onClick={handleViewResume}
                  disabled={viewingResume}
                  className="cursor-pointer text-sm font-medium text-[var(--color-rust)] underline underline-offset-2 hover:text-[var(--color-rust-dark)] disabled:opacity-50"
                >
                  {viewingResume ? "Opening…" : "View resume"}
                </button>
              </div>
            )}
            <div className="flex items-center gap-3">
              <label
                htmlFor="resume-upload"
                className="inline-flex cursor-pointer items-center border border-[var(--color-ink)] bg-[var(--color-paper)] px-3 py-1.5 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-[var(--color-paper)]"
              >
                Choose file
              </label>
              {resumeFile && (
                <span className="text-sm text-[var(--color-muted)]">{resumeFile.name}</span>
              )}
            </div>
            <input
              ref={fileInputRef}
              id="resume-upload"
              type="file"
              accept="application/pdf"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                if (file && file.size > 5 * 1024 * 1024) {
                  setError("File must be under 5 MB.");
                  e.target.value = "";
                  return;
                }
                setError(null);
                setResumeFile(file);
              }}
            />
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              {hasResume
                ? "Upload a new file to replace your existing resume."
                : "A resume is required before you can apply for jobs."}
            </p>
          </div>
        </div>
      )}

      {/* ── Basic info ── */}
      <div className="space-y-4">
        <SectionHeading>Basic information</SectionHeading>

        <div>
          <label htmlFor="headline" className="mb-1.5 block text-sm font-medium">
            Professional headline
          </label>
          <input
            id="headline"
            type="text"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="e.g. Senior Software Engineer"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="phone" className="mb-1.5 block text-sm font-medium">
            Phone number
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setPhoneError(validatePhone(e.target.value));
            }}
            placeholder="e.g. 082 123 4567 or +27 82 123 4567"
            className={inputClass}
          />
          {phoneError && (
            <p className="mt-1 text-sm text-[var(--color-rust)]">{phoneError}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="province" className="mb-1.5 block text-sm font-medium">
              Province
            </label>
            <select
              id="province"
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className={inputClass}
            >
              <option value="">Select province</option>
              {SA_PROVINCES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="city" className="mb-1.5 block text-sm font-medium">
              City / Town
            </label>
            <input
              id="city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Cape Town"
              list="sa-cities"
              className={inputClass}
            />
            <datalist id="sa-cities">
              {SA_CITIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
        </div>
      </div>

      {/* ── Qualifications ── */}
      <div className="space-y-4">
        <SectionHeading>Qualifications</SectionHeading>

        <div>
          <label htmlFor="nqf-level" className="mb-1.5 block text-sm font-medium">
            Highest NQF level
          </label>
          <select
            id="nqf-level"
            value={nqfLevel}
            onChange={(e) => setNqfLevel(e.target.value)}
            className={inputClass}
          >
            <option value="">Select NQF level</option>
            {NQF_LEVELS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="qual-title" className="mb-1.5 block text-sm font-medium">
            Qualification title
          </label>
          <input
            id="qual-title"
            type="text"
            value={qualificationTitle}
            onChange={(e) => setQualificationTitle(e.target.value)}
            placeholder="e.g. Bachelor of Commerce in Accounting"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="qual-type" className="mb-1.5 block text-sm font-medium">
            Qualification type
          </label>
          <select
            id="qual-type"
            value={qualificationType}
            onChange={(e) => setQualificationType(e.target.value)}
            className={inputClass}
          >
            <option value="">Select type</option>
            {QUALIFICATION_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="prof-reg" className="mb-1.5 block text-sm font-medium">
            Professional registration number
          </label>
          <input
            id="prof-reg"
            type="text"
            value={professionalRegistration}
            onChange={(e) => {
              setProfessionalRegistration(e.target.value);
              setProfRegError(validateProfReg(e.target.value));
            }}
            placeholder="e.g. HPCSA: PR123456 / SAICA: 12345678"
            className={inputClass}
          />
          {profRegError && (
            <p className="mt-1 text-sm text-[var(--color-rust)]">{profRegError}</p>
          )}
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            Include the registering body prefix (HPCSA, SAICA, ECSA, SACAP, etc.).{" "}
            <span className="font-medium">Self-reported — not independently verified.</span>
          </p>
        </div>
      </div>

      {/* ── Work authorisation ── */}
      <div className="space-y-4">
        <SectionHeading>Work authorisation</SectionHeading>

        <div>
          <label htmlFor="work-auth" className="mb-1.5 block text-sm font-medium">
            Work authorisation status
          </label>
          <select
            id="work-auth"
            value={workAuthorization}
            onChange={(e) => setWorkAuthorization(e.target.value)}
            className={inputClass}
          >
            <option value="">Select status</option>
            {Object.entries(WORK_AUTHORIZATION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Job preferences ── */}
      <div className="space-y-4">
        <SectionHeading>Job preferences</SectionHeading>

        <div>
          <label htmlFor="pref-province" className="mb-1.5 block text-sm font-medium">
            Preferred province
          </label>
          <select
            id="pref-province"
            value={preferredProvince}
            onChange={(e) => setPreferredProvince(e.target.value)}
            className={inputClass}
          >
            <option value="">No preference</option>
            {SA_PROVINCES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="pref-contract" className="mb-1.5 block text-sm font-medium">
            Preferred contract type
          </label>
          <select
            id="pref-contract"
            value={preferredContractType}
            onChange={(e) => setPreferredContractType(e.target.value)}
            className={inputClass}
          >
            <option value="">No preference</option>
            {(Object.entries(CONTRACT_TYPE_LABELS) as [ContractType, string][]).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="salary-min" className="mb-1.5 block text-sm font-medium">
            Minimum desired salary (ZAR / month)
          </label>
          <input
            id="salary-min"
            type="number"
            min="0"
            step="500"
            value={desiredSalaryMin}
            onChange={(e) => setDesiredSalaryMin(e.target.value)}
            placeholder="e.g. 25000"
            className={inputClass}
          />
        </div>
      </div>

      {/* ── Employment equity (private) ── */}
      <div className="space-y-4">
        <SectionHeading>
          Employment equity
          <PrivateBadge />
        </SectionHeading>
        <p className="text-xs text-[var(--color-muted)]">
          This information is stored privately and is never shared with employers or
          visible to other users. It may be used in aggregate, anonymised reporting only.
        </p>

        <div>
          <label htmlFor="disability" className="mb-1.5 block text-sm font-medium">
            Disability status
            <PrivateBadge />
          </label>
          <input
            id="disability"
            type="text"
            value={disabilityStatus}
            onChange={(e) => setDisabilityStatus(e.target.value)}
            placeholder="e.g. None / Physical / Hearing / Visual / Cognitive / Prefer not to say"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="ee-designation" className="mb-1.5 block text-sm font-medium">
            EE designation
            <PrivateBadge />
          </label>
          <select
            id="ee-designation"
            value={eeDesignation}
            onChange={(e) => setEeDesignation(e.target.value)}
            className={inputClass}
          >
            <option value="">Prefer not to say</option>
            <option value="African">African</option>
            <option value="Coloured">Coloured</option>
            <option value="Indian / Asian">Indian / Asian</option>
            <option value="White">White</option>
            <option value="Not specified">Not specified</option>
          </select>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            As defined under the Employment Equity Act, 1998.
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-[var(--color-rust)]">{error}</p>}

      {saveStatus === "saved" && (
        <p className="text-sm text-[var(--color-green)]">Profile saved.</p>
      )}

      <Button type="submit" disabled={saveStatus === "saving"}>
        {saveStatus === "saving" ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
