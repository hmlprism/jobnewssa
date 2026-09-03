import { SiteHeader } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/footer";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LinkButton } from "@/components/ui/button";
import { timeAgo } from "@/lib/utils";

export default async function EmployerDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: jobs } = await supabase
    .from("jobs")
    .select("*, applications(count)")
    .eq("posted_by", user.id)
    .order("posted_at", { ascending: false });

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
      </main>
      <SiteFooter />
    </>
  );
}
