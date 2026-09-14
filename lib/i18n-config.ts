// Shared locale configuration — imported by both proxy.ts (middleware) and
// lib/navigation.ts (client/server Link). Keeping them in one place ensures
// the two never drift out of sync.
export const locales = ["en", "af"] as const;
export type AppLocale = (typeof locales)[number];
export const defaultLocale = "en" satisfies AppLocale;
