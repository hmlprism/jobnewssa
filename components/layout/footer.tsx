import Link from "next/link";
import { SA_PROVINCES } from "@/types/database";
import { slugify } from "@/lib/slug";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-[var(--color-line)] bg-[var(--color-paper-dim)]">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {/* Brand + tagline */}
        <div className="mb-10 flex items-start justify-between gap-8">
          <div>
            <Link href="/" prefetch={false} className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center bg-[var(--color-ink)] font-display text-xs font-bold text-[var(--color-paper)]">
                JN
              </span>
              <span className="font-display text-lg font-semibold tracking-tight">
                Job News SA
              </span>
            </Link>
            <p className="mt-2 max-w-xs text-sm text-[var(--color-muted)]">
              A free, independent job board for South Africa. Listings sourced
              from public feeds and direct employer submissions.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
              Jobs by province
            </h3>
            <ul className="space-y-2 text-sm text-[var(--color-ink)]">
              {SA_PROVINCES.map((p) => (
                <li key={p}>
                  <Link
                    href={`/jobs?province=${slugify(p)}`}
                    prefetch={false}
                    className="hover:text-[var(--color-rust)]"
                  >
                    {p}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
              Job seekers
            </h3>
            <ul className="space-y-2 text-sm text-[var(--color-ink)]">
              <li>
                <Link href="/jobs" prefetch={false} className="hover:text-[var(--color-rust)]">
                  Browse all jobs
                </Link>
              </li>
              <li>
                <Link href="/auth/signup" prefetch={false} className="hover:text-[var(--color-rust)]">
                  Create a profile
                </Link>
              </li>
              <li>
                <Link href="/news" prefetch={false} className="hover:text-[var(--color-rust)]">
                  Job market news
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
              Employers
            </h3>
            <ul className="space-y-2 text-sm text-[var(--color-ink)]">
              <li>
                <Link href="/employer/post" prefetch={false} className="hover:text-[var(--color-rust)]">
                  Post a vacancy
                </Link>
              </li>
              <li>
                <Link href="/auth/signup" prefetch={false} className="hover:text-[var(--color-rust)]">
                  Create employer account
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
              About
            </h3>
            <p className="text-sm text-[var(--color-muted)]">
              Job News SA is not affiliated with Careers24, Indeed, or any
              other job board. Built in South Africa.
            </p>
          </div>
        </div>

        <div className="mt-10 border-t border-[var(--color-line)] pt-6 text-xs text-[var(--color-muted)]">
          © {new Date().getFullYear()} Job News SA. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
