import Link from "next/link";
import { SA_PROVINCES } from "@/types/database";
import { slugify } from "@/lib/slug";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-[var(--color-line)] bg-[var(--color-paper-dim)]">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div>
            <h3 className="mb-3 text-sm font-semibold">Jobs by province</h3>
            <ul className="space-y-2 text-sm text-[var(--color-muted)]">
              {SA_PROVINCES.map((p) => (
                <li key={p}>
                  <Link href={`/jobs?province=${slugify(p)}`} className="hover:text-[var(--color-rust)]">
                    {p}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold">Job seekers</h3>
            <ul className="space-y-2 text-sm text-[var(--color-muted)]">
              <li><Link href="/jobs" className="hover:text-[var(--color-rust)]">Browse all jobs</Link></li>
              <li><Link href="/auth/signup" className="hover:text-[var(--color-rust)]">Create a profile</Link></li>
              <li><Link href="/news" className="hover:text-[var(--color-rust)]">Job market news</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold">Employers</h3>
            <ul className="space-y-2 text-sm text-[var(--color-muted)]">
              <li><Link href="/employer/post" className="hover:text-[var(--color-rust)]">Post a vacancy</Link></li>
              <li><Link href="/auth/signup" className="hover:text-[var(--color-rust)]">Create employer account</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold">Job News SA</h3>
            <p className="text-sm text-[var(--color-muted)]">
              A free, independent job board for South Africa. Listings are
              sourced from public job feeds and direct employer submissions.
            </p>
          </div>
        </div>
        <div className="mt-10 border-t border-[var(--color-line)] pt-6 text-xs text-[var(--color-muted)]">
          © {new Date().getFullYear()} Job News SA. Not affiliated with Careers24 or any other job board.
        </div>
      </div>
    </footer>
  );
}
