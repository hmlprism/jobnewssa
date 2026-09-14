// Locale-aware 404 — caught when notFound() is called from any page inside
// /[locale]/*, or when Next.js cannot match a path under the locale segment.
// Rendered within app/[locale]/layout.tsx, so SiteHeader (async, uses
// next-intl + Supabase auth) and Link from @/lib/navigation are both safe.
import { SiteHeader } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/footer";
import { Link } from "@/lib/navigation";

export default function LocaleNotFound() {
  return (
    <>
      <SiteHeader />
      <main className="flex min-h-[65vh] flex-col items-center justify-center px-4 py-20 text-center">
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
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/jobs"
            prefetch={false}
            className="inline-block border border-[var(--color-ink)] bg-[var(--color-ink)] px-6 py-2.5 text-sm font-medium text-[var(--color-paper)] transition-colors hover:border-[var(--color-rust)] hover:bg-[var(--color-rust)]"
          >
            Browse jobs
          </Link>
          <Link
            href="/"
            prefetch={false}
            className="inline-block border border-[var(--color-line)] px-6 py-2.5 text-sm font-medium text-[var(--color-ink)] transition-colors hover:border-[var(--color-ink-600)]"
          >
            Homepage
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
