import { Suspense } from "react";
import {
  createClient,
  createServiceClient,
  getAuthUser,
} from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { SiteHeader } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/footer";
import { ApplicantStatus } from "@/components/employer/applicant-status";
import { timeAgo } from "@/lib/utils";
import Link from "next/link";
import type { ApplicationStatus } from "@/types/database";
import { ArrowLeft, FileText, MessageSquare } from "lucide-react";

type ApplicantRow = {
  id: string;
  cover_note: string | null;
  status: ApplicationStatus;
  created_at: string;
  profile: {
    full_name: string | null;
    headline: string | null;
    resume_url: string | null;
  } | null;
  resumeSignedUrl: string | null;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const supabase = await createClient();
  const { data: job } = await supabase
    .from("jobs")
    .select("title")
    .eq("id", jobId)
    .single();
  return { title: job ? `Applicants — ${job.title}` : "Applicants" };
}

async function ApplicantsContent({ jobId }: { jobId: string }) {
  const user = await getAuthUser();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("id, title, posted_by")
    .eq("id", jobId)
    .eq("posted_by", user.id)
    .single();

  if (!job) notFound();

  const { data: raw } = await supabase
    .from("applications")
    .select(
      "id, cover_note, status, created_at, profiles!applicant_id(full_name, headline, resume_url)"
    )
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });

  const serviceClient = createServiceClient();

  const applicants: ApplicantRow[] = await Promise.all(
    (raw ?? []).map(async (app) => {
      const profile = app.profiles as unknown as {
        full_name: string | null;
        headline: string | null;
        resume_url: string | null;
      } | null;

      let resumeSignedUrl: string | null = null;
      if (profile?.resume_url) {
        const { data } = await serviceClient.storage
          .from("resumes")
          .createSignedUrl(profile.resume_url, 3600);
        resumeSignedUrl = data?.signedUrl ?? null;
      }

      return {
        id: app.id,
        cover_note: app.cover_note,
        status: app.status as ApplicationStatus,
        created_at: app.created_at,
        profile,
        resumeSignedUrl,
      };
    })
  );

  const appIds = applicants.map((a) => a.id);
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

  return (
    <>
      <h1 className="font-display text-2xl font-semibold">{job.title}</h1>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        {applicants.length} applicant{applicants.length !== 1 ? "s" : ""}
      </p>

      <div className="mt-8">
        {applicants.length === 0 ? (
          <div className="border border-[var(--color-line)] px-6 py-16 text-center">
            <p className="font-display text-lg">No applications yet</p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Applications will appear here as candidates apply.
            </p>
          </div>
        ) : (
          <div className="border border-[var(--color-line)]">
            {applicants.map((app) => {
              const unread = unreadByApp[app.id] ?? 0;
              return (
                <div
                  key={app.id}
                  className="border-b border-[var(--color-line)] px-5 py-5 last:border-b-0"
                >
                  <div className="flex items-start justify-between gap-6">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {app.profile?.full_name ?? "Applicant"}
                      </p>
                      {app.profile?.headline && (
                        <p className="text-sm text-[var(--color-muted)]">
                          {app.profile.headline}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-[var(--color-muted)]">
                        Applied {timeAgo(app.created_at)}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <ApplicantStatus
                        applicationId={app.id}
                        initialStatus={app.status}
                      />
                      <div className="flex items-center gap-3">
                        {app.resumeSignedUrl ? (
                          <a
                            href={app.resumeSignedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm font-medium text-[var(--color-rust)] hover:underline"
                          >
                            <FileText size={13} />
                            Resume
                          </a>
                        ) : (
                          <span className="text-xs text-[var(--color-muted)]">
                            No resume
                          </span>
                        )}
                        <Link
                          href={`/applications/${app.id}/thread?from=${jobId}`}
                          className="flex items-center gap-1 text-sm font-medium text-[var(--color-indigo)] hover:underline"
                        >
                          <MessageSquare size={13} />
                          {unread > 0 ? (
                            <>
                              Message{" "}
                              <span className="inline-block bg-[var(--color-rust)] px-1.5 py-0.5 text-xs font-semibold text-[var(--color-paper)]">
                                {unread}
                              </span>
                            </>
                          ) : (
                            "Message"
                          )}
                        </Link>
                      </div>
                    </div>
                  </div>

                  {app.cover_note && (
                    <div className="mt-4 border-l-2 border-[var(--color-line)] pl-4">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                        Cover note
                      </p>
                      <p className="whitespace-pre-wrap text-sm">
                        {app.cover_note}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function ApplicantsSkeleton() {
  return (
    <>
      <div className="h-7 w-64 animate-pulse bg-[var(--color-line)]" />
      <div className="mt-2 h-4 w-24 animate-pulse bg-[var(--color-line)]" />
      <div className="mt-8 border border-[var(--color-line)]">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="border-b border-[var(--color-line)] px-5 py-5 last:border-b-0"
          >
            <div className="flex items-start justify-between gap-6">
              <div className="space-y-2">
                <div className="h-4 w-36 animate-pulse bg-[var(--color-line)]" />
                <div className="h-3 w-48 animate-pulse bg-[var(--color-line)]" />
              </div>
              <div className="h-8 w-24 animate-pulse bg-[var(--color-line)]" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default async function ApplicantsPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-12">
        <Link
          href="/employer/dashboard"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-rust)]"
        >
          <ArrowLeft size={14} />
          Back to dashboard
        </Link>

        <Suspense fallback={<ApplicantsSkeleton />}>
          <ApplicantsContent jobId={jobId} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
