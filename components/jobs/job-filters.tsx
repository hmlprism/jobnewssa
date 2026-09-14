"use client";

import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/lib/navigation";
import { useTranslations } from "next-intl";
import {
  SA_PROVINCES,
  type ContractType,
} from "@/types/database";
import type { Sector } from "@/types/database";
import { slugify } from "@/lib/slug";

const SALARY_BANDS = [12000, 24000, 36000, 48000];

const CONTRACT_TYPES: ContractType[] = [
  "permanent", "part_time", "temporary", "contract", "internship", "volunteer",
];

export function JobFilters({ sectors }: { sectors: Sector[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("Jobs.filters");
  const tc = useTranslations("Jobs.contractTypes");

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  const activeProvince = searchParams.get("province");
  const activeSector = searchParams.get("sector");
  const activeSalary = searchParams.get("min_salary");
  const activeContract = searchParams.get("contract");
  const remoteOnly = searchParams.get("remote") === "true";

  const hasFilters =
    activeProvince || activeSector || activeSalary || activeContract || remoteOnly;

  return (
    <aside className="w-full shrink-0 md:w-60 lg:w-64">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xs font-semibold text-[var(--color-muted)]">
          {t("title")}
        </h2>
        {hasFilters && (
          <button
            onClick={() => router.push(pathname)}
            className="cursor-pointer text-xs font-medium text-[var(--color-rust)] hover:underline"
          >
            {t("clearAll")}
          </button>
        )}
      </div>

      <FilterGroup label={t("salary")}>
        <div className="space-y-1.5">
          <RadioRow
            checked={!activeSalary}
            label={t("anySalary")}
            onSelect={() => setParam("min_salary", null)}
          />
          {SALARY_BANDS.map((band) => (
            <RadioRow
              key={band}
              checked={activeSalary === String(band)}
              label={`R${band.toLocaleString()}+`}
              onSelect={() => setParam("min_salary", String(band))}
            />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup label={t("province")}>
        <select
          aria-label={t("province")}
          value={activeProvince ?? ""}
          onChange={(e) => setParam("province", e.target.value || null)}
          className="w-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm"
        >
          <option value="">{t("anyProvince")}</option>
          {SA_PROVINCES.map((p) => (
            <option key={p} value={slugify(p)}>
              {p}
            </option>
          ))}
        </select>
      </FilterGroup>

      <FilterGroup label={t("sector")}>
        <select
          aria-label={t("sector")}
          value={activeSector ?? ""}
          onChange={(e) => setParam("sector", e.target.value || null)}
          className="w-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm"
        >
          <option value="">{t("anySector")}</option>
          {sectors.map((s) => (
            <option key={s.id} value={s.slug}>
              {s.name}
            </option>
          ))}
        </select>
      </FilterGroup>

      <FilterGroup label={t("contractType")} noBorder>
        <div className="space-y-1.5">
          <RadioRow
            checked={!activeContract}
            label={t("anyContract")}
            onSelect={() => setParam("contract", null)}
          />
          {CONTRACT_TYPES.map((ct) => (
            <RadioRow
              key={ct}
              checked={activeContract === ct}
              label={tc(ct)}
              onSelect={() => setParam("contract", ct)}
            />
          ))}
        </div>
      </FilterGroup>
    </aside>
  );
}

function FilterGroup({
  label,
  children,
  noBorder,
}: {
  label: string;
  children: React.ReactNode;
  noBorder?: boolean;
}) {
  return (
    <div
      className={`mb-5 pb-5 ${
        noBorder ? "" : "border-b border-[var(--color-line)]"
      }`}
    >
      <h3 className="mb-3 text-xs font-semibold text-[var(--color-muted)]">
        {label}
      </h3>
      {children}
    </div>
  );
}

function RadioRow({
  checked,
  label,
  onSelect,
}: {
  checked: boolean;
  label: string;
  onSelect: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input type="radio" checked={checked} onChange={onSelect} />
      {label}
    </label>
  );
}
