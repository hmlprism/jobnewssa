"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  SA_PROVINCES,
  CONTRACT_TYPE_LABELS,
  type ContractType,
} from "@/types/database";
import type { Sector } from "@/types/database";
import { slugify } from "@/lib/slug";

const SALARY_BANDS = [12000, 24000, 36000, 48000];

export function JobFilters({ sectors }: { sectors: Sector[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
          Filters
        </h2>
        {hasFilters && (
          <button
            onClick={() => router.push(pathname)}
            className="cursor-pointer text-xs font-medium text-[var(--color-rust)] hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      <FilterGroup label="Minimum salary / month">
        <div className="space-y-1.5">
          <RadioRow
            checked={!activeSalary}
            label="Any"
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

      <FilterGroup label="Province">
        <select
          aria-label="Province"
          value={activeProvince ?? ""}
          onChange={(e) => setParam("province", e.target.value || null)}
          className="w-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm"
        >
          <option value="">Any province</option>
          {SA_PROVINCES.map((p) => (
            <option key={p} value={slugify(p)}>
              {p}
            </option>
          ))}
        </select>
      </FilterGroup>

      <FilterGroup label="Sector">
        <select
          aria-label="Sector"
          value={activeSector ?? ""}
          onChange={(e) => setParam("sector", e.target.value || null)}
          className="w-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm"
        >
          <option value="">Any sector</option>
          {sectors.map((s) => (
            <option key={s.id} value={s.slug}>
              {s.name}
            </option>
          ))}
        </select>
      </FilterGroup>

      <FilterGroup label="Contract type" noBorder>
        <div className="space-y-1.5">
          <RadioRow
            checked={!activeContract}
            label="Any"
            onSelect={() => setParam("contract", null)}
          />
          {(Object.keys(CONTRACT_TYPE_LABELS) as ContractType[]).map((ct) => (
            <RadioRow
              key={ct}
              checked={activeContract === ct}
              label={CONTRACT_TYPE_LABELS[ct]}
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
