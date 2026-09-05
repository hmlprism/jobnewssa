import { Suspense } from "react";
import { SiteHeader } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/footer";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LinkButton } from "@/components/ui/button";
import { timeAgo } from "@/lib/utils";
import type { Company } from "@/types/database";

async function DashboardContent() {
  const user = await getAuthUser();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();

  const [{ data: jobs }, { data: companyData }] = await Promise.all([
    supabase
      .from("jobs")
      .select("*, applications(count)")
      .eq("posted_by", user.id)
      .order("posted_at", { ascending: false }),
    supabase
      .from("companies")
      .select("id, verified, verification_method, verified_at")
      .eq("owner_id", user.id)
      .maybeSingle(),
  ]);
  const company = companyData as Company | null;

  return (
    <>
      {company && !company.verified && (
        <div className="mb-6 border border-[var(--color-clay)] bg-[var(--color-clay-dim)] px-4 py-3 text-sm text-[var(--color-ink)]">
          <span className="font-medium">Your employer account is unverified.</span>{" "}
          Your jobs are visible but show an &quot;Unverified employer&quot; badge.{" "}
          <Link href="/employer/verify" className="underline underline-offset-2 hover:text-[var(--color-rust)]">
            Verify your account →
          </Link>
        </div>
      )}
      {company?.verified && (
        <div className="mb-6 border border-[var(--color-indigo)] bg-[var(--color-indigo-dim)] px-4 py-3 text-sm text-[var(--color-indigo)]">
          <span className="font-medium">✓ Verified employer</span> — your jobs display a verified badge.
        </div>
      )}

      {!jobs || jobs.length === 0 ? (
        <div className="border border-[var(--color-line)] px-6 py-16 text-center">
          <p className="font-display text-lg">No postings yet</p>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Post your first vacancy to start receiving applications.
          </p>
        </div>
      ) : (
        <div className="border-t border-[var(--color-line)]">
          {jobs.map((job) => {
            const count =
              (job as unknown as { applications: { count: number }[] })
                .applications?.[0]?.count ?? 0;
            return (
              <div
                key={job.id}
                className="flex items-center justify-between border-b border-[var(--color-line)] px-1 py-4"
              >
                <div>
                  <Link
                    href={`/jobs/${job.slug}`}
                    className="font-medium hover:text-[var(--color-rust)]"
                  >
                    {job.title}
                  </Link>
                  <p className="text-sm text-[var(--color-muted)]">
                    Posted {timeAgo(job.posted_at)} · {job.status}
                  </p>
                </div>
                <Link
                  href={`/employer/dashboard/${job.id}/applicants`}
                  className="shrink-0 text-sm font-medium text-[var(--color-rust)] hover:underline"
                >
                  View applicants ({count})
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="border-t border-[var(--color-line)]">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex items-center justify-between border-b border-[var(--color-line)] px-1 py-4"
        >
          <div className="space-y-2">
            <div className="h-4 w-52 animate-pulse bg-[var(--color-line)]" />
            <div className="h-3 w-36 animate-pulse bg-[var(--color-line)]" />
          </div>
          <div className="h-4 w-28 animate-pulse bg-[var(--color-line)]" />
        </div>
      ))}
    </div>
  );
}

export default async function EmployerDashboard() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="font-display text-2xl">Your job postings</h1>
          <LinkButton href="/employer/post" size="sm">
            Post a job
          </LinkButton>
        </div>

        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardContent />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
