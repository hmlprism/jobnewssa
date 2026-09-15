"use client";

import type { Z83SectionB, Z83Language } from "@/types/z83";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  sectionB: Z83SectionB;
  sectionD: Z83Language[];
  attempted: boolean;
  onSectionBChange: (b: Z83SectionB) => void;
  onSectionDChange: (d: Z83Language[]) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COMM_PREFS = ["Post", "Email", "Fax", "Tel"] as const;

// Display-only labels — the only strings that get translated in a future pass.
// Data values (COMM_PREFS entries) are fed to lib/z83-fill.ts → COMM_CHOICE.
// Never translate the onChange argument — always close over the English constant.
const COMM_PREF_LABELS: Record<string, string> = {
  Post: "Post",
  Email: "Email",
  Fax: "Fax",
  Tel: "Tel",
};

const CONTACT_LABEL: Record<(typeof COMM_PREFS)[number] | "", string> = {
  Post: "Postal address",
  Email: "Email address",
  Fax: "Fax number",
  Tel: "Telephone number",
  "": "Contact details",
};

const CONTACT_PLACEHOLDER: Record<(typeof COMM_PREFS)[number] | "", string> = {
  Post: "123 Main Street, Johannesburg, Gauteng, 2001",
  Email: "thabo.dlamini@email.co.za",
  Fax: "011 234 5678",
  Tel: "082 345 6789",
  "": "Select a contact method above",
};

const PROF_KEYS = ["read", "write", "speak", "understand"] as const;

const EMPTY_LANG: Z83Language = {
  language: "",
  read: "",
  write: "",
  speak: "",
  understand: "",
};

// ─── Shared style helpers ─────────────────────────────────────────────────────

const inputOk =
  "w-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder-[var(--color-muted)] focus:border-[var(--color-ink)] focus:outline-none";
const inputErr =
  "w-full border border-[var(--color-rust)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder-[var(--color-muted)] focus:border-[var(--color-rust)] focus:outline-none";
const selectOk =
  "w-full border border-[var(--color-line)] bg-[var(--color-paper)] px-2 py-1.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-ink)] focus:outline-none";

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-[var(--color-rust)]">{msg}</p>;
}

// ─── Communication preference pill ───────────────────────────────────────────

function CommPill({
  label,
  value,
  checked,
  onChange,
  error,
}: {
  label: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  error?: boolean;
}) {
  return (
    <label
      className={[
        "flex cursor-pointer items-center px-3 py-2 text-sm select-none border transition-colors text-[var(--color-ink)]",
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
        name="z83-comm-pref"
        value={value}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      {label}
    </label>
  );
}

// ─── Step D ───────────────────────────────────────────────────────────────────

export function StepD({
  sectionB,
  sectionD,
  attempted,
  onSectionBChange,
  onSectionDChange,
}: Props) {
  const setB = <K extends keyof Z83SectionB>(k: K, v: Z83SectionB[K]) =>
    onSectionBChange({ ...sectionB, [k]: v });

  // Validates a 4-digit year in the range 1966–2026 (year SA PSAP began).
  // Empty string is valid (field is optional).
  const validProfYear = (v: string) => {
    if (!v) return true;
    const y = parseInt(v, 10);
    return /^\d{4}$/.test(v) && y >= 1966 && y <= 2026;
  };

  const errs = attempted
    ? {
        communication_pref: !sectionB.communication_pref ? "Required" : undefined,
        contact_details: !sectionB.contact_details.trim()
          ? "Required"
          : sectionB.communication_pref === "Post" &&
            sectionB.contact_details.trim().length < 10
          ? "Address too short — include street, suburb, and postal code"
          : undefined,
        preferred_language:
          sectionB.preferred_language && /\d/.test(sectionB.preferred_language)
            ? "Language name cannot contain numbers"
            : undefined,
        nationality:
          sectionB.nationality &&
          (!/[a-zA-Z]/.test(sectionB.nationality) || /\d/.test(sectionB.nationality))
            ? "Nationality must contain letters only"
            : undefined,
        years_private_sector:
          sectionB.years_private_sector &&
          parseInt(sectionB.years_private_sector, 10) > 60
            ? "Maximum 60 years"
            : undefined,
        years_public_sector:
          sectionB.years_public_sector &&
          parseInt(sectionB.years_public_sector, 10) > 60
            ? "Maximum 60 years"
            : undefined,
        professional_reg_date: !validProfYear(sectionB.professional_reg_date)
          ? "Enter a 4-digit year between 1966 and 2026"
          : undefined,
      }
    : {};

  // Language table helpers
  const addLang = () => {
    if (sectionD.length < 5)
      onSectionDChange([...sectionD, { ...EMPTY_LANG }]);
  };
  const updateLang = (i: number, patch: Partial<Z83Language>) =>
    onSectionDChange(sectionD.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const removeLang = (i: number) =>
    onSectionDChange(sectionD.filter((_, idx) => idx !== i));

  const commPref = sectionB.communication_pref;

  return (
    <div className="space-y-10">
      {/* ── Contact ──────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-5 text-base font-semibold text-[var(--color-ink)]">
          Contact
        </h2>
        <div className="space-y-6">
          {/* Communication preference */}
          <div>
            <p className="mb-2 text-sm font-medium text-[var(--color-ink)]">
              Preferred method of communication{" "}
              <span className="text-[var(--color-rust)]" aria-hidden>
                *
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              {COMM_PREFS.map((pref) => (
                <CommPill
                  key={pref}
                  label={COMM_PREF_LABELS[pref] ?? pref}
                  value={pref}
                  checked={commPref === pref}
                  onChange={() => setB("communication_pref", pref)}
                  error={!!errs.communication_pref}
                />
              ))}
            </div>
            <FieldError msg={errs.communication_pref} />
          </div>

          {/* Contact details — label and input type adapt to comm pref */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-ink)]">
              {CONTACT_LABEL[commPref || ""]}{" "}
              <span className="text-[var(--color-rust)]" aria-hidden>
                *
              </span>
            </label>
            {commPref === "Post" ? (
              <textarea
                rows={2}
                className={`${errs.contact_details ? inputErr : inputOk} resize-none`}
                placeholder={CONTACT_PLACEHOLDER.Post}
                value={sectionB.contact_details}
                onChange={(e) => setB("contact_details", e.target.value)}
              />
            ) : (
              <input
                type={
                  commPref === "Email"
                    ? "email"
                    : commPref === "Tel"
                    ? "tel"
                    : "text"
                }
                inputMode={
                  commPref === "Tel"
                    ? "tel"
                    : commPref === "Email"
                    ? "email"
                    : undefined
                }
                className={errs.contact_details ? inputErr : inputOk}
                placeholder={CONTACT_PLACEHOLDER[commPref || ""]}
                value={sectionB.contact_details}
                onChange={(e) => setB("contact_details", e.target.value)}
              />
            )}
            <FieldError msg={errs.contact_details} />
          </div>

          {/* Preferred language */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-ink)]">
              Preferred language for correspondence
            </label>
            <input
              type="text"
              className={errs.preferred_language ? inputErr : inputOk}
              placeholder="English"
              value={sectionB.preferred_language}
              onChange={(e) =>
                setB("preferred_language", e.target.value.replace(/\d/g, ""))
              }
            />
            <FieldError msg={errs.preferred_language} />
          </div>
        </div>
      </section>

      {/* ── Profile details ───────────────────────────────────────────── */}
      <section>
        <h2 className="mb-5 text-base font-semibold text-[var(--color-ink)]">
          Profile details
        </h2>
        <div className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-ink)]">
              Nationality
            </label>
            <input
              type="text"
              className={errs.nationality ? inputErr : inputOk}
              placeholder="South African"
              value={sectionB.nationality}
              onChange={(e) =>
                setB("nationality", e.target.value.replace(/\d/g, ""))
              }
            />
            <FieldError msg={errs.nationality} />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-ink)]">
                Years in private sector
              </label>
              <input
                type="text"
                inputMode="numeric"
                className={errs.years_private_sector ? inputErr : inputOk}
                placeholder="3"
                value={sectionB.years_private_sector}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "");
                  const n = parseInt(digits, 10);
                  setB("years_private_sector", digits && n > 60 ? "60" : digits);
                }}
              />
              <FieldError msg={errs.years_private_sector} />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-ink)]">
                Years in public sector
              </label>
              <input
                type="text"
                inputMode="numeric"
                className={errs.years_public_sector ? inputErr : inputOk}
                placeholder="7"
                value={sectionB.years_public_sector}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "");
                  const n = parseInt(digits, 10);
                  setB("years_public_sector", digits && n > 60 ? "60" : digits);
                }}
              />
              <FieldError msg={errs.years_public_sector} />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-ink)]">
                Professional registration date
              </label>
              <input
                type="text"
                inputMode="numeric"
                className={errs.professional_reg_date ? inputErr : inputOk}
                placeholder="2018"
                value={sectionB.professional_reg_date}
                onChange={(e) =>
                  setB(
                    "professional_reg_date",
                    e.target.value.replace(/\D/g, "").slice(0, 4)
                  )
                }
              />
              {errs.professional_reg_date ? (
                <FieldError msg={errs.professional_reg_date} />
              ) : (
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  Year registered with your professional body
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-ink)]">
                Professional registration number
              </label>
              <input
                type="text"
                className={inputOk}
                placeholder="SABPP 45678"
                value={sectionB.professional_reg_number}
                onChange={(e) =>
                  setB("professional_reg_number", e.target.value)
                }
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Language proficiency (Section D) ─────────────────────────── */}
      <section>
        <h2 className="mb-1 text-base font-semibold text-[var(--color-ink)]">
          Language proficiency
        </h2>
        <p className="mb-5 text-sm text-[var(--color-muted)]">
          Up to 5 languages. The Z83 PDF prints proficiency columns (Read / Write
          / Speak / Understand) for the first two rows only.
        </p>

        <div className="space-y-4">
          {sectionD.map((lang, i) => {
            const langNameErr =
              attempted && lang.language && /\d/.test(lang.language)
                ? "Language name cannot contain numbers"
                : undefined;
            return (
            <div key={i} className="border border-[var(--color-line)] p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
                    Language {i + 1}
                  </label>
                  <input
                    type="text"
                    className={langNameErr ? inputErr : inputOk}
                    placeholder={
                      i === 0 ? "e.g. Zulu" : i === 1 ? "e.g. English" : "e.g. Sotho"
                    }
                    value={lang.language}
                    onChange={(e) =>
                      updateLang(i, { language: e.target.value.replace(/\d/g, "") })
                    }
                  />
                  <FieldError msg={langNameErr} />
                </div>
                <button
                  type="button"
                  onClick={() => removeLang(i)}
                  className="mt-5 shrink-0 text-xs text-[var(--color-muted)] hover:text-[var(--color-rust)] transition-colors"
                >
                  Remove
                </button>
              </div>

              {i < 2 && (
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {PROF_KEYS.map((key) => (
                    <div key={key}>
                      <label className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </label>
                      <select
                        className={selectOk}
                        value={lang[key]}
                        onChange={(e) =>
                          updateLang(i, {
                            [key]: e.target.value as Z83Language["read"],
                          })
                        }
                      >
                        <option value="">—</option>
                        <option value="Good">Good</option>
                        <option value="Fair">Fair</option>
                        <option value="Poor">Poor</option>
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>
            );
          })}

          {sectionD.length < 5 && (
            <button
              type="button"
              onClick={addLang}
              className="w-full border border-dashed border-[var(--color-line)] py-2.5 text-sm text-[var(--color-muted)] hover:border-[var(--color-line-hover)] hover:text-[var(--color-ink)] transition-colors"
            >
              + Add language
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
