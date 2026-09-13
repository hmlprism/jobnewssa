"use client";

import type { Z83Declarations } from "@/types/z83";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  declarations: Z83Declarations;
  onDeclarationsChange: (d: Z83Declarations) => void;
  /** section_f_ps_reappointment — the Yes/No is persisted in draft; details are session-only */
  psPreviousEmployee: boolean | null;
  onPsPreviousEmployeeChange: (v: boolean) => void;
  attempted: boolean;
}

// ─── Shared style helpers ─────────────────────────────────────────────────────

const textareaOk =
  "w-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder-[var(--color-muted)] focus:border-[var(--color-ink)] focus:outline-none resize-none";

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-[var(--color-rust)]">{msg}</p>;
}

// ─── Option pill — inline styles for selected state ───────────────────────────

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

// ─── Yes / No pair — accepts boolean | null (null = not yet answered) ─────────

function YesNo({
  name,
  value,
  onChange,
  error,
}: {
  name: string;
  value: boolean | null;
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

// ─── Declaration question ─────────────────────────────────────────────────────

function DeclQuestion({
  label,
  hint,
  name,
  value,
  onChange,
  detailLabel,
  detailPlaceholder,
  detailValue,
  onDetailChange,
  error,
}: {
  label: string;
  hint?: string;
  name: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
  detailLabel?: string;
  detailPlaceholder?: string;
  detailValue?: string;
  onDetailChange?: (v: string) => void;
  error?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-[var(--color-ink)]">{label}</p>
        {hint && (
          <p className="mt-0.5 text-xs text-[var(--color-muted)]">{hint}</p>
        )}
      </div>
      <YesNo name={name} value={value} onChange={onChange} error={error} />
      {error && (
        <FieldError msg="Please select Yes or No" />
      )}
      {value === true && detailLabel && onDetailChange !== undefined && (
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-ink)]">
            {detailLabel}
          </label>
          <textarea
            rows={3}
            className={textareaOk}
            placeholder={detailPlaceholder}
            value={detailValue ?? ""}
            onChange={(e) => onDetailChange(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}

// ─── Step C ───────────────────────────────────────────────────────────────────

export function StepC({
  declarations,
  onDeclarationsChange,
  psPreviousEmployee,
  onPsPreviousEmployeeChange,
  attempted,
}: Props) {
  const set = <K extends keyof Z83Declarations>(k: K, v: Z83Declarations[K]) =>
    onDeclarationsChange({ ...declarations, [k]: v });

  // Validation — only shown after first failed Next attempt
  const errs = attempted
    ? {
        criminal_conviction: declarations.criminal_conviction === null,
        pending_criminal: declarations.pending_criminal === null,
        dismissed_misconduct: declarations.dismissed_misconduct === null,
        pending_disciplinary: declarations.pending_disciplinary === null,
        resigned_pending: declarations.resigned_pending === null,
        discharged_ill_health: declarations.discharged_ill_health === null,
        business_with_state: declarations.business_with_state === null,
        will_relinquish:
          declarations.business_with_state === true &&
          declarations.will_relinquish === null,
        ps_previous_employee: psPreviousEmployee === null,
      }
    : {
        criminal_conviction: false,
        pending_criminal: false,
        dismissed_misconduct: false,
        pending_disciplinary: false,
        resigned_pending: false,
        discharged_ill_health: false,
        business_with_state: false,
        will_relinquish: false,
        ps_previous_employee: false,
      };

  return (
    <div className="space-y-10">
      {/* ── Session-only notice ───────────────────────────────────────── */}
      <div className="border-l-2 border-[var(--color-amber)] bg-[var(--color-amber-dim)] px-4 py-3">
        <p className="text-sm font-medium text-[var(--color-ink)]">
          These answers are never saved — not even when you are signed in.
        </p>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          Criminal record, disciplinary history, and business-interest disclosures
          are treated as sensitive by design. They are cleared when you close this
          tab and must be re-entered each session.
        </p>
      </div>

      {/* ── Past conduct ─────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-5 text-base font-semibold text-[var(--color-ink)]">
          Past conduct
        </h2>
        <div className="space-y-8">
          <DeclQuestion
            label="Have you been convicted of a criminal offence?"
            name="z83-criminal-conviction"
            value={declarations.criminal_conviction}
            onChange={(v) => set("criminal_conviction", v)}
            detailLabel="Provide details — nature of the offence, date, and sentence imposed"
            detailPlaceholder="e.g. Reckless driving, Cape Town, 2018 — fine of R3 000"
            detailValue={declarations.criminal_conviction_details}
            onDetailChange={(v) => set("criminal_conviction_details", v)}
            error={errs.criminal_conviction}
          />

          <DeclQuestion
            label="Do you have any pending criminal charges against you?"
            name="z83-pending-criminal"
            value={declarations.pending_criminal}
            onChange={(v) => set("pending_criminal", v)}
            detailLabel="Provide details of the pending charges"
            detailPlaceholder="e.g. Theft charges, Johannesburg Magistrate's Court"
            detailValue={declarations.pending_criminal_details}
            onDetailChange={(v) => set("pending_criminal_details", v)}
            error={errs.pending_criminal}
          />

          <DeclQuestion
            label="Have you been dismissed from employment due to misconduct in the last 5 years?"
            name="z83-dismissed-misconduct"
            value={declarations.dismissed_misconduct}
            onChange={(v) => set("dismissed_misconduct", v)}
            detailLabel="Provide details — employer, date, and nature of misconduct"
            detailPlaceholder="e.g. Dept of Health Gauteng, August 2022 — gross negligence"
            detailValue={declarations.dismissed_misconduct_details}
            onDetailChange={(v) => set("dismissed_misconduct_details", v)}
            error={errs.dismissed_misconduct}
          />

          <DeclQuestion
            label="Are there any pending disciplinary proceedings against you?"
            name="z83-pending-disciplinary"
            value={declarations.pending_disciplinary}
            onChange={(v) => set("pending_disciplinary", v)}
            detailLabel="Provide details of the pending proceedings"
            detailPlaceholder="e.g. Current employer — hearing scheduled Nov 2026"
            detailValue={declarations.pending_disciplinary_details}
            onDetailChange={(v) => set("pending_disciplinary_details", v)}
            error={errs.pending_disciplinary}
          />

          <DeclQuestion
            label="Have you resigned from employment while disciplinary proceedings were pending against you?"
            name="z83-resigned-pending"
            value={declarations.resigned_pending}
            onChange={(v) => set("resigned_pending", v)}
            detailLabel="Provide details — employer, position, date, and nature of proceedings"
            detailPlaceholder="e.g. ABC Municipality, March 2023 — insubordination allegation"
            detailValue={declarations.resigned_pending_details}
            onDetailChange={(v) => set("resigned_pending_details", v)}
            error={errs.resigned_pending}
          />

          <DeclQuestion
            label="Have you been discharged from the public service on grounds of ill health?"
            name="z83-discharged-ill-health"
            value={declarations.discharged_ill_health}
            onChange={(v) => set("discharged_ill_health", v)}
            error={errs.discharged_ill_health}
          />
        </div>
      </section>

      {/* ── Business interests ───────────────────────────────────────── */}
      <section>
        <h2 className="mb-5 text-base font-semibold text-[var(--color-ink)]">
          Business interests
        </h2>
        <div className="space-y-8">
          <DeclQuestion
            label="Do you conduct business with the state, or are you a director of a company that conducts business with the state?"
            name="z83-business-with-state"
            value={declarations.business_with_state}
            onChange={(v) => set("business_with_state", v)}
            detailLabel="Provide details — nature of the business and name of the state entity"
            detailPlaceholder="e.g. Director of XYZ Trading (Pty) Ltd, contracted to Dept of Public Works"
            detailValue={declarations.business_with_state_details}
            onDetailChange={(v) => set("business_with_state_details", v)}
            error={errs.business_with_state}
          />

          {declarations.business_with_state === true && (
            <DeclQuestion
              label="If appointed, will you relinquish those business interests?"
              name="z83-will-relinquish"
              value={declarations.will_relinquish}
              onChange={(v) => set("will_relinquish", v)}
              error={errs.will_relinquish}
            />
          )}
        </div>
      </section>

      {/* ── Previous public service ──────────────────────────────────── */}
      <section>
        <h2 className="mb-5 text-base font-semibold text-[var(--color-ink)]">
          Previous public service
        </h2>
        <div className="space-y-6">
          <DeclQuestion
            label="Were you previously employed in the public service?"
            hint="Includes national or provincial government, municipalities, and state entities."
            name="z83-ps-previous-employee"
            value={psPreviousEmployee}
            onChange={onPsPreviousEmployeeChange}
            detailLabel="Provide details — department, period of employment, reason for leaving"
            detailPlaceholder="e.g. Dept of Finance, 2015–2021 — resigned to pursue private sector role"
            detailValue={declarations.ps_reappointment_details}
            onDetailChange={(v) => set("ps_reappointment_details", v)}
            error={errs.ps_previous_employee}
          />
        </div>
      </section>
    </div>
  );
}
