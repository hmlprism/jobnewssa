import { Suspense } from "react";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/footer";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { JobCard } from "@/components/jobs/job-card";
import { Bookmark } from "lucide-react";
import Link from "next/link";
import type { Job } from "@/types/database";

export const metadata = { title: "Saved Jobs" };

async function SavedContent() {
  const user = await getAuthUser();
  if (!user) redirect("/auth/login?next=%2Fsaved");

  const supabase = await createClient();

  const { data: raw } = await supabase
    .from("saved_jobs")
    .select(
      "job_id, jobs!job_id(" +
        "id, title, slug, company_name_raw, province, city, is_remote, " +
        "contract_type, salary_min, salary_max, salary_is_market_related, " +
        "source, posted_at, expires_at, is_urgent, " +
        "company:companies(id, name, slug, verified)" +
      ")"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const savedJobs: Job[] = (raw ?? [])
    .map((r) => (r as unknown as { jobs: Job }).jobs)
    .filter(Boolean);

  if (savedJobs.length === 0) {
    return (
      <div className="border border-[var(--color-line)] px-6 py-16 text-center">
        <Bookmark
          size={32}
          className="mx-auto mb-3 text-[var(--color-muted)]"
        />
        <p className="font-display text-lg">No saved jobs yet</p>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          <Link
            href="/jobs"
            prefetch={false}
            className="underline underline-offset-2 hover:text-[var(--color-rust)]"
          >
            Browse vacancies
          </Link>{" "}
          and tap the bookmark icon on any listing to save it here.
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-[var(--color-line)]">
      {savedJobs.map((job) => (
        <JobCard key={job.id} job={job} initialSaved={true} />
      ))}
    </div>
  );
}

function SavedSkeleton() {
  return (
    <div className="border border-[var(--color-line)]">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="border-b border-[var(--color-line)] px-5 py-5 last:border-b-0"
        >
          <div className="h-4 w-56 animate-pulse bg-[var(--color-line)]" />
          <div className="mt-2 h-3 w-40 animate-pulse bg-[var(--color-line)]" />
        </div>
      ))}
    </div>
  );
}

export default function SavedPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
        <h1 className="mb-8 font-display text-2xl font-semibold">
          Saved jobs
        </h1>
        <Suspense fallback={<SavedSkeleton />}>
          <SavedContent />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
