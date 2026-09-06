import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { SiteHeader } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/footer";
import { MessageThread, type MsgRow } from "@/components/messaging/message-thread";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import Link from "next/link";

// Never cache this page — router.refresh() must always get fresh messages.
export const dynamic = "force-dynamic";

// ── suspended content (auth + queries + mark-read) ─────────────────────────

async function ThreadContent({ applicationId }: { applicationId: string }) {
  const user = await getAuthUser();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();

  // Fetch the application with job and applicant details.
  // The applications SELECT RLS policy allows this only if auth.uid() is
  // the applicant OR the job poster — so a 404 here means unauthorised.
  const { data: appData } = await supabase
    .from("applications")
    .select(
      "id, applicant_id, status, jobs!job_id(id, title, slug, posted_by, company_name_raw), profiles!applicant_id(full_name)"
    )
    .eq("id", applicationId)
    .maybeSingle();

  if (!appData) notFound();

  const job = appData.jobs as unknown as {
    id: string;
    title: string;
    slug: string;
    posted_by: string;
    company_name_raw: string | null;
  };
  const applicantProfile = appData.profiles as unknown as { full_name: string | null } | null;

  const isApplicant = appData.applicant_id === user.id;
  const isEmployer  = job.posted_by === user.id;

  // Extra defence-in-depth: RLS should already reject non-parties, but
  // verify explicitly before showing any content.
  if (!isApplicant && !isEmployer) notFound();

  // Mark all unread messages from the OTHER party as read now that this
  // user has opened the thread. The RLS UPDATE policy (sender_id != auth.uid()
  // AND party check) ensures we can only update messages we received.
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("application_id", applicationId)
    .neq("sender_id", user.id)
    .is("read_at", null);

  // Fetch messages oldest-first for chronological display.
  const { data: rawMessages } = await supabase
    .from("messages")
    .select("id, sender_id, body, created_at, profiles!sender_id(full_name)")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: true });

  const messages: MsgRow[] = (rawMessages ?? []).map((m) => ({
    id: m.id,
    sender_id: m.sender_id,
    body: m.body,
    created_at: m.created_at,
    senderName: (m.profiles as unknown as { full_name: string | null } | null)?.full_name ?? null,
  }));

  const otherPartyName = isApplicant
    ? (job.company_name_raw ?? "Employer")
    : (applicantProfile?.full_name ?? "Applicant");

  return (
    <>
      {/* Context strip */}
      <div className="mb-6 border-b border-[var(--color-line)] pb-4">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
          {isApplicant ? "Employer" : "Applicant"}
        </p>
        <h1 className="font-display text-2xl">{otherPartyName}</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Re:{" "}
          <Link
            href={`/jobs/${job.slug}`}
            className="hover:text-[var(--color-rust)] underline underline-offset-2"
          >
            {job.title}
          </Link>
        </p>
      </div>

      {/* Client component: renders message list + send form with optimistic updates */}
      <MessageThread
        applicationId={applicationId}
        currentUserId={user.id}
        otherPartyName={otherPartyName}
        initialMessages={messages}
      />
    </>
  );
}

function ThreadSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 border-b border-[var(--color-line)] pb-4">
        <div className="h-3 w-16 animate-pulse bg-[var(--color-line)]" />
        <div className="h-7 w-48 animate-pulse bg-[var(--color-line)]" />
        <div className="h-4 w-64 animate-pulse bg-[var(--color-line)]" />
      </div>
      <div className="space-y-4">
        {[0, 1].map((i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
            <div className="h-16 w-56 animate-pulse bg-[var(--color-line)]" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── page shell ─────────────────────────────────────────────────────────────

export default async function ThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ applicationId: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { applicationId } = await params;
  const { from } = await searchParams;

  // Resolve back link: employer comes from the applicants list, seeker from their apps.
  // The "from" query param carries the jobId when the employer navigates here.
  const backHref = from ? `/employer/dashboard/${from}/applicants` : "/applications";
  const backLabel = from ? "← Back to applicants" : "← Back to my applications";

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <Link
          href={backHref}
          className="mb-6 block text-sm text-[var(--color-muted)] hover:text-[var(--color-rust)]"
        >
          {backLabel}
        </Link>

        <Suspense fallback={<ThreadSkeleton />}>
          <ThreadContent applicationId={applicationId} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
