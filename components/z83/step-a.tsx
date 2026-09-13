"use client";

import type { Z83SectionA } from "@/types/z83";

interface Props {
  data: Z83SectionA;
  attempted: boolean;
  onChange: (data: Z83SectionA) => void;
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-[var(--color-rust)]">{msg}</p>;
}

const inputOk =
  "w-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder-[var(--color-muted)] focus:border-[var(--color-ink)] focus:outline-none";
const inputErr =
  "w-full border border-[var(--color-rust)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder-[var(--color-muted)] focus:border-[var(--color-rust)] focus:outline-none";

export function StepA({ data, attempted, onChange }: Props) {
  const set = (k: keyof Z83SectionA, v: string) =>
    onChange({ ...data, [k]: v });

  const e = attempted
    ? {
        position: !data.position.trim()
          ? "Required"
          : data.position.trim().length < 5 || !/[a-zA-Z]/.test(data.position)
          ? "Enter the full position title (at least 5 characters)"
          : undefined,
        department: !data.department.trim()
          ? "Required"
          : data.department.trim().length < 5 || !/[a-zA-Z]/.test(data.department)
          ? "Enter the full department name (at least 5 characters)"
          : undefined,
        ref_no: !data.ref_no.trim()
          ? "Required"
          : data.ref_no.trim().length < 3 || /^(.)\1*$/.test(data.ref_no.trim())
          ? "Enter a valid reference number (e.g. DPSA 01/2026/01)"
          : undefined,
        availability: !data.availability.trim()
          ? "Required"
          : data.availability.trim().length < 5 || !/[a-zA-Z]/.test(data.availability)
          ? "Enter your availability or notice period (at least 5 characters)"
          : undefined,
      }
    : {};

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--color-muted)]">
        Copy these details exactly from the job advertisement. They appear verbatim
        on page 1 of your Z83.
      </p>

      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--color-ink)]">
          Position applied for{" "}
          <span className="text-[var(--color-rust)]" aria-hidden>*</span>
        </label>
        <textarea
          rows={2}
          className={`${e.position ? inputErr : inputOk} resize-none`}
          placeholder="Deputy Director: Human Resources Development"
          value={data.position}
          onChange={(e) => set("position", e.target.value)}
        />
        <FieldError msg={e.position} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--color-ink)]">
          Department{" "}
          <span className="text-[var(--color-rust)]" aria-hidden>*</span>
        </label>
        <input
          type="text"
          className={e.department ? inputErr : inputOk}
          placeholder="Department of Public Service and Administration"
          value={data.department}
          onChange={(e) => set("department", e.target.value)}
        />
        <FieldError msg={e.department} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--color-ink)]">
          Reference number{" "}
          <span className="text-[var(--color-rust)]" aria-hidden>*</span>
        </label>
        <input
          type="text"
          className={e.ref_no ? inputErr : inputOk}
          placeholder="DPSA 01/2026/01"
          value={data.ref_no}
          onChange={(e) => set("ref_no", e.target.value)}
        />
        <FieldError msg={e.ref_no} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--color-ink)]">
          Availability / notice period{" "}
          <span className="text-[var(--color-rust)]" aria-hidden>*</span>
        </label>
        <input
          type="text"
          className={e.availability ? inputErr : inputOk}
          placeholder="1 calendar month notice period"
          value={data.availability}
          onChange={(e) => set("availability", e.target.value)}
        />
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          e.g. &ldquo;Immediately&rdquo; or &ldquo;1 calendar month notice
          period&rdquo;
        </p>
        <FieldError msg={e.availability} />
      </div>
    </div>
  );
}
