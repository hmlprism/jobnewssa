import { Suspense } from "react";
import { SiteHeader } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/footer";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LinkButton } from "@/components/ui/button";
import { timeAgo } from "@/lib/utils";
import type { Company } from "@/types/database";
import { Plus, ExternalLink, Users } from "lucide-react";

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
      {/* Verification banners */}
      {company && !company.verified && (
        <div className="mb-6 border border-[var(--color-clay)] bg-[var(--color-clay-dim)] px-5 py-4 text-sm">
          <p>
            <span className="font-semibold">
              Your employer account is unverified.
            </span>{" "}
            Your jobs are visible but show an &quot;Unverified employer&quot;
            badge.{" "}
            <Link
              href="/employer/verify"
              className="font-medium underline underline-offset-2 hover:text-[var(--color-rust)]"
            >
              Verify your account →
            </Link>
          </p>
        </div>
      )}
      {company?.verified && (
        <div className="mb-6 border border-[var(--color-indigo)] bg-[var(--color-indigo-dim)] px-5 py-4 text-sm text-[var(--color-indigo)]">
          <span className="font-semibold">✓ Verified employer</span> — your
          jobs display a verified badge.
        </div>
      )}

      {/* Job listings */}
      {!jobs || jobs.length === 0 ? (
        <div className="border border-[var(--color-line)] px-6 py-16 text-center">
          <p className="font-display text-lg">No postings yet</p>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Post your first vacancy to start receiving applications.
          </p>
          <LinkButton href="/employer/post" size="md" className="mt-6">
            <Plus size={16} />
            Post your first job
          </LinkButton>
        </div>
      ) : (
        <div className="border border-[var(--color-line)]">
          {jobs.map((job) => {
            const count =
              (job as unknown as { applications: { count: number }[] })
                .applications?.[0]?.count ?? 0;
            return (
              <div
                key={job.id}
                className="flex items-center justify-between gap-4 border-b border-[var(--color-line)] px-5 py-4 last:border-b-0"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/jobs/${job.slug}`}
                      className="truncate font-medium hover:text-[var(--color-rust)]"
                    >
                      {job.title}
                    </Link>
                    <span
                      className={`shrink-0 text-xs font-medium ${
                        job.status === "published"
                          ? "text-[var(--color-green)]"
                          : "text-[var(--color-muted)]"
                      }`}
                    >
                      {job.status === "published" ? "Live" : job.status}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-[var(--color-muted)]">
                    Posted {timeAgo(job.posted_at)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <Link
                    href={`/employer/dashboard/${job.id}/applicants`}
                    className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-rust)] hover:underline"
                  >
                    <Users size={14} />
                    {count} applicant{count !== 1 ? "s" : ""}
                  </Link>
                  <Link
                    href={`/jobs/${job.slug}`}
                    className="hidden text-[var(--color-muted)] hover:text-[var(--color-ink)] sm:block"
                    aria-label="View listing"
                  >
                    <ExternalLink size={14} />
                  </Link>
                </div>
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
    <div className="border border-[var(--color-line)]">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-4 last:border-b-0"
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
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="font-display text-2xl font-semibold">
            Your job postings
          </h1>
          <LinkButton href="/employer/post" size="sm">
            <Plus size={15} />
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
