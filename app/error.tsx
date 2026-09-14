"use client";
// Error boundary for all routes — catches unhandled render errors in
// app/[locale]/* pages (and any root-level pages) and shows a branded
// recovery screen instead of a blank white crash page.
//
// This is a client component (required by Next.js error boundary spec).
// It receives `reset`, a function that re-renders the failed segment so
// the user can retry without a full page reload.
import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In production, pipe `error` to your error-reporting service here
    // (e.g. Sentry.captureException(error)).
    console.error("[ErrorBoundary]", error);
  }, [error]);

  return (
    <main className="flex min-h-[65vh] flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
        500
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold text-[var(--color-ink)]">
        Something went wrong
      </h1>
      <p className="mt-3 max-w-sm text-sm text-[var(--color-muted)]">
        An unexpected error occurred. Try again — if the problem persists,
        come back shortly.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-[11px] text-[var(--color-muted)]">
          Error ref: {error.digest}
        </p>
      )}
      <button
        onClick={reset}
        className="mt-8 cursor-pointer border border-[var(--color-ink)] bg-[var(--color-ink)] px-6 py-2.5 text-sm font-medium text-[var(--color-paper)] transition-colors hover:border-[var(--color-rust)] hover:bg-[var(--color-rust)]"
      >
        Try again
      </button>
    </main>
  );
}
