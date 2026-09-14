"use client";

import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { usePathname, Link } from "@/lib/navigation";
import { locales, type AppLocale } from "@/lib/i18n-config";

const LOCALE_LABEL: Record<AppLocale, string> = { en: "EN", af: "AF" };

export function LocaleSwitcher({ className }: { className?: string }) {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  return (
    <div
      className={`flex items-center gap-1 text-xs font-medium${className ? ` ${className}` : ""}`}
    >
      {locales.map((l, i) => (
        <span key={l} className="flex items-center gap-1">
          {i > 0 && (
            <span className="select-none text-[var(--color-line)]" aria-hidden>
              |
            </span>
          )}
          {l === locale ? (
            <span className="text-[var(--color-ink)]">{LOCALE_LABEL[l]}</span>
          ) : (
            <Link
              href={search ? `${pathname}?${search}` : pathname}
              locale={l}
              prefetch={false}
              className="text-[var(--color-muted)] transition-colors duration-100 hover:text-[var(--color-rust)]"
            >
              {LOCALE_LABEL[l]}
            </Link>
          )}
        </span>
      ))}
    </div>
  );
}
