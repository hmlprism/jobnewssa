import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { SiteHeader } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/footer";
import {
  MessageThread,
  type MsgRow,
} from "@/components/messaging/message-thread";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

async function ThreadContent({
  applicationId,
}: {
  applicationId: string;
}) {
  const user = await getAuthUser();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();

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
  const applicantProfile = appData.profiles as unknown as {
    full_name: string | null;
  } | null;

  const isApplicant = appData.applicant_id === user.id;
  const isEmployer = job.posted_by === user.id;

  if (!isApplicant && !isEmployer) notFound();

  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("application_id", applicationId)
    .neq("sender_id", user.id)
    .is("read_at", null);

  const { data: rawMessages } = await supabase
    .from("messages")
    .select(
      "id, sender_id, body, created_at, profiles!sender_id(full_name)"
    )
    .eq("application_id", applicationId)
    .order("created_at", { ascending: true });

  const messages: MsgRow[] = (rawMessages ?? []).map((m) => ({
    id: m.id,
    sender_id: m.sender_id,
    body: m.body,
    created_at: m.created_at,
    senderName:
      (m.profiles as unknown as { full_name: string | null } | null)
        ?.full_name ?? null,
  }));

  const otherPartyName = isApplicant
    ? (job.company_name_raw ?? "Employer")
    : (applicantProfile?.full_name ?? "Applicant");

  return (
    <>
      {/* Context header */}
      <div className="mb-6 border-b border-[var(--color-line)] pb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
          {isApplicant ? "Employer" : "Applicant"}
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold">
          {otherPartyName}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Re:{" "}
          <Link
            href={`/jobs/${job.slug}`}
            prefetch={false}
            className="underline underline-offset-2 hover:text-[var(--color-rust)]"
          >
            {job.title}
          </Link>
        </p>
      </div>

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
          <div
            key={i}
            className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}
          >
            <div className="h-16 w-56 animate-pulse bg-[var(--color-line)]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function ThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ applicationId: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { applicationId } = await params;
  const { from } = await searchParams;

  const backHref = from
    ? `/employer/dashboard/${from}/applicants`
    : "/applications";
  const backLabel = from ? "Back to applicants" : "Back to my applications";

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-12">
        <Link
          href={backHref}
          prefetch={false}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-rust)]"
        >
          <ArrowLeft size={14} />
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
