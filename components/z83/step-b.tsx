"use client";

import { useTranslations } from "next-intl";
import type { Z83SectionB } from "@/types/z83";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  sectionB: Z83SectionB;
  dob: string;       // display-only — never stored in DB
  idNumber: string;  // display-only — never stored in DB
  attempted: boolean;
  onSectionBChange: (b: Z83SectionB) => void;
  onDobChange: (v: string) => void;
  onIdNumberChange: (v: string) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RACES: Array<Z83SectionB["race"]> = [
  "African",
  "White",
  "Coloured",
  "Indian",
  "Other",
];

// ─── Shared style helpers ─────────────────────────────────────────────────────

const inputOk =
  "w-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder-[var(--color-muted)] focus:border-[var(--color-ink)] focus:outline-none";
const inputErr =
  "w-full border border-[var(--color-rust)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder-[var(--color-muted)] focus:border-[var(--color-rust)] focus:outline-none";

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-[var(--color-rust)]">{msg}</p>;
}

// ─── Option pill — used for both race chips and Yes/No pairs ─────────────────
// Radio input is visually hidden; the label provides all styling and click area.

function OptionPill({
  label,
  checked,
  name,
  value,
  onChange,
  error,
}: {
  label: string;
  checked: boolean;
  name: string;
  value: string;
  onChange: () => void;
  error?: boolean;
}) {
  return (
    <label
      className={[
        "flex cursor-pointer items-center px-3 py-2 text-sm transition-colors select-none border text-[var(--color-ink)]",
        !checked && error
          ? "border-[var(--color-rust)]"
          : !checked
          ? "border-[var(--color-line)] hover:border-[var(--color-line-hover)]"
          : "",
      ].join(" ")}
      style={
        checked
          ? {
              borderColor: "var(--color-ink)",
              backgroundColor: "var(--color-ink-50)",
              fontWeight: 500,
            }
          : undefined
      }
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      {label}
    </label>
  );
}

// ─── Yes / No pair ────────────────────────────────────────────────────────────

function YesNo({
  name,
  value,
  onChange,
  error,
  yesLabel,
  noLabel,
}: {
  name: string;
  value: boolean;
  onChange: (v: boolean) => void;
  error?: boolean;
  yesLabel: string;
  noLabel: string;
}) {
  return (
    <div className="flex gap-2">
      <OptionPill
        label={yesLabel}
        checked={value === true}
        name={name}
        value="yes"
        onChange={() => onChange(true)}
        error={error}
      />
      <OptionPill
        label={noLabel}
        checked={value === false}
        name={name}
        value="no"
        onChange={() => onChange(false)}
        error={error}
      />
    </div>
  );
}

// ─── Display-only badge ───────────────────────────────────────────────────────

function DisplayOnlyNote({ text }: { text: string }) {
  return (
    <span className="ml-2 text-[10px] font-normal uppercase tracking-wide text-[var(--color-muted)]">
      {text}
    </span>
  );
}

// ─── Step B ───────────────────────────────────────────────────────────────────

export function StepB({
  sectionB,
  dob,
  idNumber,
  attempted,
  onSectionBChange,
  onDobChange,
  onIdNumberChange,
}: Props) {
  const t = useTranslations("Z83");
  // Display-only labels — translated here so data values (RACES / "Male"/"Female")
  // fed to lib/z83-fill.ts remain the English constants.
  const RACE_LABELS: Record<string, string> = {
    African: t("stepB.raceAfrican"),
    White: t("stepB.raceWhite"),
    Coloured: t("stepB.raceColoured"),
    Indian: t("stepB.raceIndian"),
    Other: t("stepB.raceOther"),
  };
  const GENDER_LABELS: Record<string, string> = {
    Male: t("stepB.genderMale"),
    Female: t("stepB.genderFemale"),
  };

  const set = <K extends keyof Z83SectionB>(k: K, v: Z83SectionB[K]) =>
    onSectionBChange({ ...sectionB, [k]: v });

  // Validation (only shown after first failed Next attempt)
  const errs = attempted
    ? {
        name: !sectionB.name.trim()
          ? t("shared.required")
          : sectionB.name.trim().length < 2 || !/[a-zA-Z]/.test(sectionB.name)
          ? t("stepB.nameError")
          : undefined,
        dob: !dob.trim()
          ? t("shared.required")
          : !/^\d{6}$/.test(dob)
          ? t("stepB.dobError")
          : undefined,
        race: !sectionB.race ? t("shared.required") : undefined,
        gender: !sectionB.gender ? t("shared.required") : undefined,
        id_number:
          idNumber && idNumber.length !== 13
            ? t("stepB.idError")
            : undefined,
        passport_number:
          sectionB.passport_number.trim() &&
          (sectionB.passport_number.trim().length < 3 ||
            !/[a-zA-Z]/.test(sectionB.passport_number))
            ? t("stepB.passportError")
            : undefined,
      }
    : {};

  return (
    <div className="space-y-10">
      {/* ── Identity ─────────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-5 text-base font-semibold text-[var(--color-ink)]">
          {t("stepB.identityHeading")}
        </h2>
        <div className="space-y-5">
          {/* Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-ink)]">
              {t("stepB.nameLabel")}{" "}
              <span className="text-[var(--color-rust)]" aria-hidden>*</span>
            </label>
            <input
              type="text"
              className={errs.name ? inputErr : inputOk}
              placeholder="DLAMINI Thabo Sipho"
              value={sectionB.name}
              onChange={(e) => set("name", e.target.value)}
            />
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              {t("stepB.nameHint")}
            </p>
            <FieldError msg={errs.name} />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {/* Date of birth */}
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-ink)]">
                {t("stepB.dobLabel")}{" "}
                <span className="text-[var(--color-rust)]" aria-hidden>*</span>
                <DisplayOnlyNote text={t("stepB.pdfOnlyNote")} />
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                className={errs.dob ? inputErr : inputOk}
                placeholder="150390"
                value={dob}
                onChange={(e) => onDobChange(e.target.value.replace(/\D/g, ""))}
              />
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                {t("stepB.dobHint")}
              </p>
              <FieldError msg={errs.dob} />
            </div>

            {/* ID number */}
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-ink)]">
                {t("stepB.idLabel")}
                <DisplayOnlyNote text={t("stepB.pdfOnlyNote")} />
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={13}
                className={errs.id_number ? inputErr : inputOk}
                placeholder="9003155678083"
                value={idNumber}
                onChange={(e) =>
                  onIdNumberChange(e.target.value.replace(/\D/g, ""))
                }
              />
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                {t("stepB.idHint")}
              </p>
              <FieldError msg={errs.id_number} />
            </div>

            {/* Passport number */}
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-ink)]">
                {t("stepB.passportLabel")}{" "}
                <span className="font-normal text-[var(--color-muted)]">
                  {t("stepB.passportSuffix")}
                </span>
              </label>
              <input
                type="text"
                className={errs.passport_number ? inputErr : inputOk}
                placeholder="A12345678"
                value={sectionB.passport_number}
                onChange={(e) => set("passport_number", e.target.value)}
              />
              <FieldError msg={errs.passport_number} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Demographics ─────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-1 text-base font-semibold text-[var(--color-ink)]">
          {t("stepB.demographicsHeading")}
        </h2>
        <p className="mb-5 text-sm text-[var(--color-muted)]">
          {t("stepB.demographicsHint")}
        </p>

        <div className="space-y-6">
          {/* Race */}
          <div>
            <p className="mb-2 text-sm font-medium text-[var(--color-ink)]">
              {t("stepB.raceLabel")}{" "}
              <span className="text-[var(--color-rust)]" aria-hidden>*</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {RACES.map((race) => (
                <OptionPill
                  key={race}
                  label={RACE_LABELS[race] ?? race}
                  checked={sectionB.race === race}
                  name="z83-race"
                  value={race}
                  onChange={() => set("race", race)}
                  error={!!errs.race && !sectionB.race}
                />
              ))}
            </div>
            <FieldError msg={errs.race} />
          </div>

          {/* Gender */}
          <div>
            <p className="mb-2 text-sm font-medium text-[var(--color-ink)]">
              {t("stepB.genderLabel")}{" "}
              <span className="text-[var(--color-rust)]" aria-hidden>*</span>
            </p>
            <div className="flex gap-2">
              {(["Male", "Female"] as const).map((g) => (
                <OptionPill
                  key={g}
                  label={GENDER_LABELS[g] ?? g}
                  checked={sectionB.gender === g}
                  name="z83-gender"
                  value={g}
                  onChange={() => set("gender", g)}
                  error={!!errs.gender && !sectionB.gender}
                />
              ))}
            </div>
            <FieldError msg={errs.gender} />
          </div>

          {/* Disability */}
          <div>
            <p className="mb-2 text-sm font-medium text-[var(--color-ink)]">
              {t("stepB.disabilityQuestion")}
            </p>
            <YesNo
              name="z83-disability"
              value={sectionB.disability}
              onChange={(v) => set("disability", v)}
              yesLabel={t("stepB.yes")}
              noLabel={t("stepB.no")}
            />
          </div>
        </div>
      </section>

      {/* ── Citizenship ──────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-5 text-base font-semibold text-[var(--color-ink)]">
          {t("stepB.citizenshipHeading")}
        </h2>
        <div className="space-y-6">
          {/* SA Citizen */}
          <div>
            <p className="mb-2 text-sm font-medium text-[var(--color-ink)]">
              {t("stepB.citizenQuestion")}
            </p>
            <YesNo
              name="z83-sa-citizen"
              value={sectionB.sa_citizen}
              onChange={(v) => set("sa_citizen", v)}
              yesLabel={t("stepB.yes")}
              noLabel={t("stepB.no")}
            />
          </div>

          {/* Work permit — conditional */}
          {!sectionB.sa_citizen && (
            <div>
              <p className="mb-2 text-sm font-medium text-[var(--color-ink)]">
                {t("stepB.workPermitQuestion")}
              </p>
              <YesNo
                name="z83-work-permit"
                value={sectionB.work_permit}
                onChange={(v) => set("work_permit", v)}
                yesLabel={t("stepB.yes")}
                noLabel={t("stepB.no")}
              />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
