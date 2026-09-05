import { Suspense } from "react";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/footer";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/utils";
import Link from "next/link";
import type { ApplicationStatus } from "@/types/database";

export const metadata = { title: "My Applications" };

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  submitted: "Submitted",
  viewed: "Viewed",
  shortlisted: "Shortlisted",
  rejected: "Rejected",
  hired: "Hired",
};

const STATUS_COLOURS: Record<ApplicationStatus, string> = {
  submitted: "text-[var(--color-muted)]",
  viewed:    "text-[var(--color-ink)]",
  shortlisted:"text-[var(--color-indigo)]",
  rejected:  "text-[var(--color-rust)]",
  hired:     "text-[var(--color-sage,#6B7A5E)]",
};

async function ApplicationsContent() {
  const user = await getAuthUser();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();

  type AppRow = {
    id: string;
    status: ApplicationStatus;
    created_at: string;
    job: { id: string; title: string; slug: string; company_name_raw: string | null } | null;
  };

  const { data: raw } = await supabase
    .from("applications")
    .select("id, status, created_at, jobs!job_id(id, title, slug, company_name_raw)")
    .eq("applicant_id", user.id)
    .order("created_at", { ascending: false });

  const apps: AppRow[] = (raw ?? []).map((r) => ({
    id: r.id,
    status: r.status as ApplicationStatus,
    created_at: r.created_at,
    job: r.jobs as unknown as AppRow["job"],
  }));

  // Unread message counts: messages sent by the employer that haven't been read yet
  const appIds = apps.map((a) => a.id);
  const unreadByApp: Record<string, number> = {};

  if (appIds.length > 0) {
    const { data: unreadRows } = await supabase
      .from("messages")
      .select("application_id")
      .in("application_id", appIds)
      .is("read_at", null)
      .neq("sender_id", user.id);

    for (const m of unreadRows ?? []) {
      const id = m.application_id as string;
      unreadByApp[id] = (unreadByApp[id] ?? 0) + 1;
    }
  }

  if (apps.length === 0) {
    return (
      <div className="border border-[var(--color-line)] px-6 py-16 text-center">
        <p className="font-display text-lg">No applications yet</p>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          <Link href="/jobs" className="underline underline-offset-2 hover:text-[var(--color-rust)]">
            Browse vacancies
          </Link>{" "}
          and apply — your applications will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[var(--color-line)] border-t border-[var(--color-line)]">
      {apps.map((app) => {
        const unread = unreadByApp[app.id] ?? 0;
        return (
          <div key={app.id} className="flex items-center justify-between gap-4 py-4 px-1">
            <div className="min-w-0">
              {app.job ? (
                <Link
                  href={`/jobs/${app.job.slug}`}
                  className="font-medium hover:text-[var(--color-rust)]"
                >
                  {app.job.title}
                </Link>
              ) : (
                <span className="font-medium text-[var(--color-muted)]">Job removed</span>
              )}
              <p className="mt-0.5 text-sm text-[var(--color-muted)]">
                {app.job?.company_name_raw ?? "—"} · Applied {timeAgo(app.created_at)}
              </p>
              <p className={`mt-0.5 text-xs font-medium ${STATUS_COLOURS[app.status]}`}>
                {STATUS_LABELS[app.status]}
              </p>
            </div>

            <Link
              href={`/applications/${app.id}/thread`}
              className="shrink-0 text-sm font-medium text-[var(--color-rust)] hover:underline"
            >
              {unread > 0 ? (
                <>
                  Messages{" "}
                  <span className="inline-block bg-[var(--color-rust)] px-1.5 py-0.5 text-xs font-semibold text-[var(--color-paper)]">
                    {unread}
                  </span>
                </>
              ) : (
                "Messages"
              )}
            </Link>
          </div>
        );
      })}
    </div>
  );
}

function ApplicationsSkeleton() {
  return (
    <div className="divide-y divide-[var(--color-line)] border-t border-[var(--color-line)]">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-4 px-1">
          <div className="space-y-2">
            <div className="h-4 w-52 animate-pulse bg-[var(--color-line)]" />
            <div className="h-3 w-40 animate-pulse bg-[var(--color-line)]" />
          </div>
          <div className="h-4 w-20 animate-pulse bg-[var(--color-line)]" />
        </div>
      ))}
    </div>
  );
}

export default async function ApplicationsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="mb-8 font-display text-2xl">My applications</h1>
        <Suspense fallback={<ApplicationsSkeleton />}>
          <ApplicationsContent />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
