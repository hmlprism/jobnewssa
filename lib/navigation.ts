// Locale-aware navigation primitives generated from the shared routing config.
// Import Link, redirect, useRouter, usePathname from here instead of next/link
// or next/navigation — they automatically prefix hrefs with the current locale.
import { createNavigation } from "next-intl/navigation";
import { locales, defaultLocale } from "./i18n-config";

export const { Link, redirect, useRouter, usePathname } = createNavigation({
  locales,
  defaultLocale,
  localePrefix: "always",
});
