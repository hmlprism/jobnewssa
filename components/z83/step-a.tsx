"use client";

import { useTranslations } from "next-intl";
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
  const t = useTranslations("Z83");
  const set = (k: keyof Z83SectionA, v: string) =>
    onChange({ ...data, [k]: v });

  const e = attempted
    ? {
        position: !data.position.trim()
          ? t("shared.required")
          : data.position.trim().length < 5 || !/[a-zA-Z]/.test(data.position)
          ? t("stepA.positionError")
          : undefined,
        department: !data.department.trim()
          ? t("shared.required")
          : data.department.trim().length < 5 || !/[a-zA-Z]/.test(data.department)
          ? t("stepA.departmentError")
          : undefined,
        ref_no: !data.ref_no.trim()
          ? t("shared.required")
          : data.ref_no.trim().length < 3 || /^(.)\1*$/.test(data.ref_no.trim())
          ? t("stepA.refNoError")
          : undefined,
        availability: !data.availability.trim()
          ? t("shared.required")
          : data.availability.trim().length < 5 || !/[a-zA-Z]/.test(data.availability)
          ? t("stepA.availError")
          : undefined,
      }
    : {};

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--color-muted)]">
        {t("stepA.intro")}
      </p>

      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--color-ink)]">
          {t("stepA.positionLabel")}{" "}
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
          {t("stepA.departmentLabel")}{" "}
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
          {t("stepA.refNoLabel")}{" "}
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
          {t("stepA.availLabel")}{" "}
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
          {t("stepA.availHint")}
        </p>
        <FieldError msg={e.availability} />
      </div>
    </div>
  );
}
