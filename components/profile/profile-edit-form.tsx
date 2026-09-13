"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  SA_PROVINCES,
  CONTRACT_TYPE_LABELS,
  type Profile,
  type ContractType,
} from "@/types/database";

// Labels now come from Shared.nqfLevels translations
const NQF_LEVELS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"] as const;

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
] as const;

const SA_CITIES = [
  "Johannesburg", "Pretoria", "Tshwane", "Centurion", "Sandton", "Soweto",
  "Midrand", "Roodepoort", "Krugersdorp", "Germiston", "Benoni", "Boksburg",
  "Alberton", "Kempton Park", "Ekurhuleni", "Springs", "Vereeniging", "Vanderbijlpark",
  "Cape Town", "George", "Stellenbosch", "Paarl", "Worcester", "Knysna",
  "Mossel Bay", "Hermanus", "Bellville", "Somerset West", "Malmesbury", "Strand",
  "Durban", "Pietermaritzburg", "Richards Bay", "Newcastle", "Pinetown",
  "Umhlanga", "Ballito", "Port Shepstone", "Ladysmith", "Tongaat",
  "Gqeberha", "East London", "Mthatha", "Queenstown", "King William's Town",
  "Makhanda", "Bhisho", "Butterworth", "Port Alfred",
  "Polokwane", "Tzaneen", "Thohoyandou", "Mokopane", "Giyani", "Bela-Bela",
  "Mbombela", "eMalahleni", "Secunda", "Middelburg", "Standerton",
  "Piet Retief", "White River",
  "Rustenburg", "Klerksdorp", "Potchefstroom", "Mahikeng", "Brits", "Hartbeespoort",
  "Bloemfontein", "Welkom", "Phuthaditjhaba", "Sasolburg", "Kroonstad", "Bethlehem",
  "Kimberley", "Upington", "Springbok", "De Aar", "Kuruman",
];

// Returns a Profile.errors.* key, or null
function validatePhone(value: string): string | null {
  if (!value.trim()) return null;
  if (/[a-zA-Z]/.test(value)) return "errors.phoneDigitsOnly";
  const stripped = value.replace(/[\s\-().]/g, "");
  if (/^\+27[0-9]{9}$/.test(stripped)) return null;
  if (/^0[0-9]{9}$/.test(stripped)) return null;
  return "errors.phoneInvalid";
}

function validateProfReg(value: string): string | null {
  if (!value.trim()) return null;
  const upper = value.toUpperCase().trim();

  if (upper.startsWith("SAICA")) {
    const digits = value.replace(/[^0-9]/g, "");
    if (digits.length > 0 && digits.length !== 8) {
      return "errors.saicaDigits";
    }
  }
  if (upper.startsWith("ECSA")) {
    const rest = value.replace(/^ECSA[:\s]*/i, "").trim();
    if (rest && !/^[0-9]+$/.test(rest)) {
      return "errors.ecsaNumeric";
    }
  }
  if (upper.startsWith("SACAP")) {
    const rest = value.replace(/^SACAP[:\s]*/i, "").trim();
    if (rest && !/^[A-Z0-9/\-]+$/i.test(rest)) {
      return "errors.sacapFormat";
    }
  }
  if (upper.startsWith("HPCSA")) {
    const rest = value.replace(/^HPCSA[:\s]*/i, "").trim();
    if (!rest)
      return "errors.hpcsaPrefix";
  }

  return null;
}

const inputClass =
  "w-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2.5 text-sm";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="border-b border-[var(--color-line)] pb-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
      {children}
    </h2>
  );
}

function PrivateBadge() {
  const t = useTranslations("Profile");
  return (
    <span className="ml-2 text-xs font-normal normal-case tracking-normal text-[var(--color-muted)]">
      {t("privateBadge")}
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
  const t = useTranslations("Profile");
  const tShared = useTranslations("Shared");
  const tJobs = useTranslations("Jobs");
  const isEmployer = profile.role === "employer";

  const [headline, setHeadline] = useState(profile.headline ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [province, setProvince] = useState(profile.province ?? "");
  const [city, setCity] = useState(profile.city ?? "");

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [hasResume, setHasResume] = useState(!!profile.resume_url);
  const [resumePath, setResumePath] = useState(profile.resume_url);
  const [viewingResume, setViewingResume] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nqfLevel, setNqfLevel] = useState(profile.nqf_level ?? "");
  const [qualificationTitle, setQualificationTitle] = useState(
    profile.qualification_title ?? ""
  );
  const [qualificationType, setQualificationType] = useState(
    profile.qualification_type ?? ""
  );
  const [professionalRegistration, setProfessionalRegistration] = useState(
    profile.professional_registration ?? ""
  );
  const [profRegError, setProfRegError] = useState<string | null>(null);

  const [workAuthorization, setWorkAuthorization] = useState(
    profile.work_authorization ?? ""
  );

  const [preferredProvince, setPreferredProvince] = useState(
    profile.preferred_province ?? ""
  );
  const [preferredContractType, setPreferredContractType] = useState(
    profile.preferred_contract_type ?? ""
  );
  const [desiredSalaryMin, setDesiredSalaryMin] = useState(
    profile.desired_salary_min != null
      ? String(profile.desired_salary_min)
      : ""
  );

  const [disabilityStatus, setDisabilityStatus] = useState(
    profile.disability_status ?? ""
  );
  const [eeDesignation, setEeDesignation] = useState(
    profile.ee_designation ?? ""
  );

  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleViewResume() {
    if (!resumePath) return;
    setViewingResume(true);
    const supabase = createClient();
    const { data } = await supabase.storage
      .from("resumes")
      .createSignedUrl(resumePath, 60);
    setViewingResume(false);
    if (data?.signedUrl)
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const phoneErrKey = validatePhone(phone);
    const profRegErrKey = validateProfReg(professionalRegistration);
    setPhoneError(phoneErrKey ? t(phoneErrKey) : null);
    setProfRegError(profRegErrKey ? t(profRegErrKey) : null);
    if (phoneErrKey || profRegErrKey) {
      setError(t("errors.fixErrors"));
      setSaveStatus("error");
      return;
    }

    setSaveStatus("saving");
    setError(null);

    const supabase = createClient();
    let resume_url = profile.resume_url;

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
        ...(!isEmployer ? { resume_url } : {}),
        nqf_level: nqfLevel || null,
        qualification_title: qualificationTitle || null,
        qualification_type: qualificationType || null,
        professional_registration: professionalRegistration || null,
        work_authorization: workAuthorization || null,
        preferred_province: preferredProvince || null,
        preferred_contract_type:
          (preferredContractType as ContractType) || null,
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
      {/* Resume */}
      {!isEmployer && (
        <div className="space-y-4">
          <SectionHeading>{t("resume.sectionHeading")}</SectionHeading>
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              {t("resume.label")}{" "}
              <span className="font-normal text-[var(--color-muted)]">
                {t("resume.labelHint")}
              </span>
            </label>
            {hasResume && (
              <div className="mb-3 flex items-center gap-3">
                <p className="text-sm text-[var(--color-green)]">
                  {t("resume.onFile")}
                </p>
                <button
                  type="button"
                  onClick={handleViewResume}
                  disabled={viewingResume}
                  className="cursor-pointer text-sm font-medium text-[var(--color-rust)] underline underline-offset-2 hover:text-[var(--color-rust-dark)] disabled:opacity-50"
                >
                  {viewingResume ? t("resume.viewOpening") : t("resume.view")}
                </button>
              </div>
            )}
            <div className="flex items-center gap-3">
              <label
                htmlFor="resume-upload"
                className="inline-flex cursor-pointer items-center border border-[var(--color-ink)] bg-[var(--color-paper)] px-3 py-1.5 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-[var(--color-paper)]"
              >
                {t("resume.chooseFile")}
              </label>
              {resumeFile && (
                <span className="text-sm text-[var(--color-muted)]">
                  {resumeFile.name}
                </span>
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
                  setError(t("errors.fileTooLarge"));
                  e.target.value = "";
                  return;
                }
                setError(null);
                setResumeFile(file);
              }}
            />
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              {hasResume ? t("resume.replaceHint") : t("resume.requiredHint")}
            </p>
          </div>
        </div>
      )}

      {/* Basic info */}
      <div className="space-y-4">
        <SectionHeading>{t("basicInfo.sectionHeading")}</SectionHeading>

        <div>
          <label htmlFor="headline" className="mb-1.5 block text-sm font-medium">
            {t("basicInfo.headline")}
          </label>
          <input
            id="headline"
            type="text"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder={t("basicInfo.headlinePlaceholder")}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="phone" className="mb-1.5 block text-sm font-medium">
            {t("basicInfo.phone")}
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              const errKey = validatePhone(e.target.value);
              setPhoneError(errKey ? t(errKey) : null);
            }}
            placeholder={t("basicInfo.phonePlaceholder")}
            className={inputClass}
          />
          {phoneError && (
            <p className="mt-1 text-sm text-[var(--color-rust)]">
              {phoneError}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="province"
              className="mb-1.5 block text-sm font-medium"
            >
              {t("basicInfo.province")}
            </label>
            <select
              id="province"
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className={inputClass}
            >
              <option value="">{t("basicInfo.provinceSelect")}</option>
              {SA_PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="city" className="mb-1.5 block text-sm font-medium">
              {t("basicInfo.city")}
            </label>
            <input
              id="city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={t("basicInfo.cityPlaceholder")}
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

      {/* Qualifications */}
      <div className="space-y-4">
        <SectionHeading>{t("qualifications.sectionHeading")}</SectionHeading>

        <div>
          <label
            htmlFor="nqf-level"
            className="mb-1.5 block text-sm font-medium"
          >
            {t("qualifications.nqfLevel")}
          </label>
          <select
            id="nqf-level"
            value={nqfLevel}
            onChange={(e) => setNqfLevel(e.target.value)}
            className={inputClass}
          >
            <option value="">{t("qualifications.nqfSelect")}</option>
            {NQF_LEVELS.map((value) => (
              <option key={value} value={value}>
                {tShared(`nqfLevels.${value}`)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="qual-title"
            className="mb-1.5 block text-sm font-medium"
          >
            {t("qualifications.qualTitle")}
          </label>
          <input
            id="qual-title"
            type="text"
            value={qualificationTitle}
            onChange={(e) => setQualificationTitle(e.target.value)}
            placeholder={t("qualifications.qualTitlePlaceholder")}
            className={inputClass}
          />
        </div>

        <div>
          <label
            htmlFor="qual-type"
            className="mb-1.5 block text-sm font-medium"
          >
            {t("qualifications.qualType")}
          </label>
          <select
            id="qual-type"
            value={qualificationType}
            onChange={(e) => setQualificationType(e.target.value)}
            className={inputClass}
          >
            <option value="">{t("qualifications.qualTypeSelect")}</option>
            {QUALIFICATION_TYPES.map((qualType) => (
              <option key={qualType} value={qualType}>
                {tShared(`qualificationTypes.${qualType}`)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="prof-reg"
            className="mb-1.5 block text-sm font-medium"
          >
            {t("qualifications.profReg")}
          </label>
          <input
            id="prof-reg"
            type="text"
            value={professionalRegistration}
            onChange={(e) => {
              setProfessionalRegistration(e.target.value);
              const errKey = validateProfReg(e.target.value);
              setProfRegError(errKey ? t(errKey) : null);
            }}
            placeholder={t("qualifications.profRegPlaceholder")}
            className={inputClass}
          />
          {profRegError && (
            <p className="mt-1 text-sm text-[var(--color-rust)]">
              {profRegError}
            </p>
          )}
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            {t("qualifications.profRegHint")}{" "}
            <span className="font-medium">
              {t("qualifications.profRegSelfReported")}
            </span>
          </p>
        </div>
      </div>

      {/* Work authorisation */}
      <div className="space-y-4">
        <SectionHeading>{t("workAuth.sectionHeading")}</SectionHeading>
        <div>
          <label
            htmlFor="work-auth"
            className="mb-1.5 block text-sm font-medium"
          >
            {t("workAuth.label")}
          </label>
          <select
            id="work-auth"
            value={workAuthorization}
            onChange={(e) => setWorkAuthorization(e.target.value)}
            className={inputClass}
          >
            <option value="">{t("workAuth.select")}</option>
            {(["citizen", "permanent_resident", "work_permit", "other"] as const).map((key) => (
              <option key={key} value={key}>
                {t(`workAuth.${key}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Job preferences */}
      {!isEmployer && (
        <div className="space-y-4">
          <SectionHeading>{t("jobPrefs.sectionHeading")}</SectionHeading>

          <div>
            <label
              htmlFor="pref-province"
              className="mb-1.5 block text-sm font-medium"
            >
              {t("jobPrefs.preferredProvince")}
            </label>
            <select
              id="pref-province"
              value={preferredProvince}
              onChange={(e) => setPreferredProvince(e.target.value)}
              className={inputClass}
            >
              <option value="">{t("jobPrefs.noPreference")}</option>
              {SA_PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="pref-contract"
              className="mb-1.5 block text-sm font-medium"
            >
              {t("jobPrefs.preferredContract")}
            </label>
            <select
              id="pref-contract"
              value={preferredContractType}
              onChange={(e) => setPreferredContractType(e.target.value)}
              className={inputClass}
            >
              <option value="">{t("jobPrefs.noPreference")}</option>
              {(Object.keys(CONTRACT_TYPE_LABELS) as ContractType[]).map((value) => (
                <option key={value} value={value}>
                  {tJobs(`contractTypes.${value}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="salary-min"
              className="mb-1.5 block text-sm font-medium"
            >
              {t("jobPrefs.desiredSalary")}
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
      )}

      {/* Employment equity */}
      <div className="space-y-4">
        <SectionHeading>
          {t("equity.sectionHeading")}
          <PrivateBadge />
        </SectionHeading>
        <p className="text-xs text-[var(--color-muted)]">
          {t("equity.disclaimer")}
        </p>

        <div>
          <label
            htmlFor="disability"
            className="mb-1.5 block text-sm font-medium"
          >
            {t("equity.disabilityStatus")}
            <PrivateBadge />
          </label>
          <input
            id="disability"
            type="text"
            value={disabilityStatus}
            onChange={(e) => setDisabilityStatus(e.target.value)}
            placeholder={t("equity.disabilityPlaceholder")}
            className={inputClass}
          />
        </div>

        <div>
          <label
            htmlFor="ee-designation"
            className="mb-1.5 block text-sm font-medium"
          >
            {t("equity.eeDesignation")}
            <PrivateBadge />
          </label>
          <select
            id="ee-designation"
            value={eeDesignation}
            onChange={(e) => setEeDesignation(e.target.value)}
            className={inputClass}
          >
            <option value="">{t("equity.preferNotToSay")}</option>
            {(["African", "Coloured", "Indian / Asian", "White", "Not specified"] as const).map((val) => (
              <option key={val} value={val}>
                {t(`equity.eeOptions.${val}`)}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            {t("equity.encouragement")}
          </p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-[var(--color-rust)]">{error}</p>
      )}

      {saveStatus === "saved" && (
        <p className="text-sm text-[var(--color-green)]">{t("save.saved")}</p>
      )}

      <Button type="submit" disabled={saveStatus === "saving"}>
        {saveStatus === "saving" ? t("save.saving") : t("save.saveProfile")}
      </Button>
    </form>
  );
}
