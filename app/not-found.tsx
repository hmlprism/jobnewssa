// Root-level 404 — rendered when no route matches at all.
// This page is outside [locale] so next-intl is unavailable; all text is
// hardcoded English. SiteHeader is intentionally omitted (it calls the
// server Supabase client for auth, which is safe but adds latency and noise
// to a dead-end 404). SiteFooter uses plain next/link — safe here.
import Link from "next/link";
import { SiteFooter } from "@/components/layout/footer";

export default function RootNotFound() {
  return (
    <>
      <main className="flex min-h-[72vh] flex-col items-center justify-center px-4 py-20 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
          404
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-[var(--color-ink)]">
          Page not found
        </h1>
        <p className="mt-3 max-w-sm text-sm text-[var(--color-muted)]">
          We couldn&apos;t find the page you were looking for. It may have
          moved, or the link might be incorrect.
        </p>
        <Link
          href="/"
          prefetch={false}
          className="mt-8 inline-block border border-[var(--color-ink)] bg-[var(--color-ink)] px-6 py-2.5 text-sm font-medium text-[var(--color-paper)] transition-colors hover:border-[var(--color-rust)] hover:bg-[var(--color-rust)]"
        >
          Go to homepage
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
