"use client";

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

// Display-only labels — the only strings that get translated in a future pass.
// The data values (RACES entries, "Male"/"Female") are stored in state and fed
// to lib/z83-fill.ts → RACE_CHOICE / GENDER_CHOICE. Never translate the
// onChange argument — always close over the English constant from RACES.
const RACE_LABELS: Record<string, string> = {
  African: "African",
  White: "White",
  Coloured: "Coloured",
  Indian: "Indian",
  Other: "Other",
};

const GENDER_LABELS: Record<string, string> = {
  Male: "Male",
  Female: "Female",
};

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
}: {
  name: string;
  value: boolean;
  onChange: (v: boolean) => void;
  error?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <OptionPill
        label="Yes"
        checked={value === true}
        name={name}
        value="yes"
        onChange={() => onChange(true)}
        error={error}
      />
      <OptionPill
        label="No"
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

function DisplayOnlyNote() {
  return (
    <span className="ml-2 text-[10px] font-normal uppercase tracking-wide text-[var(--color-muted)]">
      PDF only — never saved
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
  const set = <K extends keyof Z83SectionB>(k: K, v: Z83SectionB[K]) =>
    onSectionBChange({ ...sectionB, [k]: v });

  // Validation (only shown after first failed Next attempt)
  const errs = attempted
    ? {
        name: !sectionB.name.trim()
          ? "Required"
          : sectionB.name.trim().length < 2 || !/[a-zA-Z]/.test(sectionB.name)
          ? "Enter surname and full names (must include letters)"
          : undefined,
        dob: !dob.trim()
          ? "Required"
          : !/^\d{6}$/.test(dob)
          ? "Must be exactly 6 digits (DDMMYY)"
          : undefined,
        race: !sectionB.race ? "Required" : undefined,
        gender: !sectionB.gender ? "Required" : undefined,
        id_number:
          idNumber && idNumber.length !== 13
            ? "SA ID number must be exactly 13 digits"
            : undefined,
        passport_number:
          sectionB.passport_number.trim() &&
          (sectionB.passport_number.trim().length < 3 ||
            !/[a-zA-Z]/.test(sectionB.passport_number))
            ? "Enter a valid passport number (e.g. A12345678)"
            : undefined,
      }
    : {};

  return (
    <div className="space-y-10">
      {/* ── Identity ─────────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-5 text-base font-semibold text-[var(--color-ink)]">
          Identity
        </h2>
        <div className="space-y-5">
          {/* Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-ink)]">
              Surname and full names{" "}
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
              Surname first in capitals, then first names — e.g. DLAMINI Thabo Sipho
            </p>
            <FieldError msg={errs.name} />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {/* Date of birth */}
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-ink)]">
                Date of birth{" "}
                <span className="text-[var(--color-rust)]" aria-hidden>*</span>
                <DisplayOnlyNote />
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
                DDMMYY — e.g. 150390 for 15 March 1990
              </p>
              <FieldError msg={errs.dob} />
            </div>

            {/* ID number */}
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-ink)]">
                SA ID number
                <DisplayOnlyNote />
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
                13 digits. Leave blank if using a passport.
              </p>
              <FieldError msg={errs.id_number} />
            </div>

            {/* Passport number */}
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-ink)]">
                Passport number{" "}
                <span className="font-normal text-[var(--color-muted)]">
                  (if no SA ID)
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
          Demographics
        </h2>
        <p className="mb-5 text-sm text-[var(--color-muted)]">
          Required by the Z83 for equity reporting purposes.
        </p>

        <div className="space-y-6">
          {/* Race */}
          <div>
            <p className="mb-2 text-sm font-medium text-[var(--color-ink)]">
              Race{" "}
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
              Gender{" "}
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
              Do you have a disability?
            </p>
            <YesNo
              name="z83-disability"
              value={sectionB.disability}
              onChange={(v) => set("disability", v)}
            />
          </div>
        </div>
      </section>

      {/* ── Citizenship ──────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-5 text-base font-semibold text-[var(--color-ink)]">
          Citizenship
        </h2>
        <div className="space-y-6">
          {/* SA Citizen */}
          <div>
            <p className="mb-2 text-sm font-medium text-[var(--color-ink)]">
              Are you a South African citizen?
            </p>
            <YesNo
              name="z83-sa-citizen"
              value={sectionB.sa_citizen}
              onChange={(v) => set("sa_citizen", v)}
            />
          </div>

          {/* Work permit — conditional */}
          {!sectionB.sa_citizen && (
            <div>
              <p className="mb-2 text-sm font-medium text-[var(--color-ink)]">
                Do you have a valid work permit?
              </p>
              <YesNo
                name="z83-work-permit"
                value={sectionB.work_permit}
                onChange={(v) => set("work_permit", v)}
              />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
