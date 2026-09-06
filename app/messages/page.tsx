import { redirect } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/footer";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { MessageSquare } from "lucide-react";

export const metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

type ConversationSummary = {
  applicationId: string;
  jobTitle: string;
  jobSlug: string;
  otherPartyName: string;
  lastBody: string | null;
  lastAt: string | null;
  unreadCount: number;
  myRole: "applicant" | "employer";
};

function formatInboxTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const msgStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round(
    (todayStart.getTime() - msgStart.getTime()) / 86400000
  );

  if (diffDays === 0) {
    return d.toLocaleTimeString("en-ZA", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7)
    return d.toLocaleDateString("en-ZA", { weekday: "short" });
  return d.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function previewBody(body: string): string {
  const firstLine = body.split("\n")[0];
  return firstLine.length > 80 ? firstLine.slice(0, 80) + "…" : firstLine;
}

async function getInboxConversations(
  userId: string
): Promise<ConversationSummary[]> {
  const supabase = await createClient();

  const { data: rawApps } = await supabase.from("applications").select(`
      id,
      applicant_id,
      applicant_profile:profiles!applicant_id (full_name),
      job:jobs!job_id (id, title, slug, posted_by, company_name_raw)
    `);

  const apps = rawApps ?? [];
  if (apps.length === 0) return [];

  const appIds = apps.map((a) => a.id);

  const { data: rawMsgs } = await supabase
    .from("messages")
    .select("id, application_id, sender_id, body, created_at, read_at")
    .in("application_id", appIds)
    .order("created_at", { ascending: false });

  const allMsgs = rawMsgs ?? [];

  const msgByApp = new Map<string, typeof allMsgs>();
  for (const msg of allMsgs) {
    if (!msgByApp.has(msg.application_id))
      msgByApp.set(msg.application_id, []);
    msgByApp.get(msg.application_id)!.push(msg);
  }

  const conversations: ConversationSummary[] = apps.map((app) => {
    const job = app.job as unknown as {
      id: string;
      title: string;
      slug: string;
      posted_by: string;
      company_name_raw: string | null;
    };
    const applicantProfile = app.applicant_profile as unknown as {
      full_name: string | null;
    } | null;
    const myRole: "applicant" | "employer" =
      app.applicant_id === userId ? "applicant" : "employer";
    const appMsgs = msgByApp.get(app.id) ?? [];
    const latestMsg = appMsgs[0] ?? null;
    const unreadCount = appMsgs.filter(
      (m) => m.sender_id !== userId && m.read_at === null
    ).length;

    const otherPartyName =
      myRole === "applicant"
        ? (job.company_name_raw ?? "Employer")
        : (applicantProfile?.full_name ?? "Applicant");

    return {
      applicationId: app.id,
      jobTitle: job.title,
      jobSlug: job.slug,
      otherPartyName,
      lastBody: latestMsg?.body ?? null,
      lastAt: latestMsg?.created_at ?? null,
      unreadCount,
      myRole,
    };
  });

  conversations.sort((a, b) => {
    if (!a.lastAt && !b.lastAt) return 0;
    if (!a.lastAt) return 1;
    if (!b.lastAt) return -1;
    return b.lastAt.localeCompare(a.lastAt);
  });

  return conversations;
}

function ConversationRow({ conv }: { conv: ConversationSummary }) {
  const hasUnread = conv.unreadCount > 0;
  return (
    <Link
      href={`/applications/${conv.applicationId}/thread`}
      className={`group block border-b border-[var(--color-line)] px-5 py-4 transition-colors hover:bg-[var(--color-paper-dim)] ${
        hasUnread
          ? "border-l-3 border-l-[var(--color-rust)]"
          : ""
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p
            className={`truncate text-sm ${
              hasUnread ? "font-semibold" : "font-medium"
            }`}
          >
            {conv.otherPartyName}
            <span className="mx-1.5 font-normal text-[var(--color-muted)]">
              ·
            </span>
            <span className="font-normal text-[var(--color-muted)]">
              {conv.jobTitle}
            </span>
          </p>
          <p className="mt-0.5 truncate text-sm text-[var(--color-muted)]">
            {conv.lastBody ? previewBody(conv.lastBody) : "No messages yet"}
          </p>
        </div>
        <div className="flex flex-shrink-0 flex-col items-end gap-1">
          {conv.lastAt && (
            <span className="whitespace-nowrap text-xs text-[var(--color-muted)]">
              {formatInboxTime(conv.lastAt)}
            </span>
          )}
          {hasUnread && (
            <span className="inline-flex items-center justify-center bg-[var(--color-rust)] px-1.5 py-px text-[10px] font-bold leading-none text-[var(--color-paper)]">
              {conv.unreadCount}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function ConversationGroup({
  label,
  conversations,
}: {
  label: string;
  conversations: ConversationSummary[];
}) {
  if (conversations.length === 0) return null;
  return (
    <section>
      <h2 className="border-b border-[var(--color-line)] pb-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
        {label}
      </h2>
      <div>
        {conversations.map((conv) => (
          <ConversationRow key={conv.applicationId} conv={conv} />
        ))}
      </div>
    </section>
  );
}

export default async function MessagesPage() {
  const user = await getAuthUser();
  if (!user) redirect("/auth/login");

  const conversations = await getInboxConversations(user.id);

  const asSeeker = conversations.filter((c) => c.myRole === "applicant");
  const asEmployer = conversations.filter((c) => c.myRole === "employer");
  const showRoleLabels = asSeeker.length > 0 && asEmployer.length > 0;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-12">
        <h1 className="mb-8 font-display text-2xl font-semibold">Messages</h1>

        {conversations.length === 0 ? (
          <div className="border border-[var(--color-line)] px-6 py-14 text-center">
            <MessageSquare
              size={32}
              className="mx-auto mb-3 text-[var(--color-muted)]"
            />
            <p className="font-display text-lg">No conversations yet</p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Conversations start when an employer messages an applicant, or
              vice versa, after a job application is submitted.
            </p>
            <div className="mt-6 flex justify-center gap-4 text-sm">
              <Link
                href="/jobs"
                className="font-medium underline underline-offset-2 hover:text-[var(--color-rust)]"
              >
                Find jobs to apply for
              </Link>
              <span className="text-[var(--color-muted)]">·</span>
              <Link
                href="/applications"
                className="font-medium underline underline-offset-2 hover:text-[var(--color-rust)]"
              >
                My applications
              </Link>
            </div>
          </div>
        ) : showRoleLabels ? (
          <div className="space-y-8">
            <ConversationGroup
              label="As job seeker"
              conversations={asSeeker}
            />
            <ConversationGroup
              label="As employer"
              conversations={asEmployer}
            />
          </div>
        ) : (
          <div className="border-t border-[var(--color-line)]">
            {conversations.map((conv) => (
              <ConversationRow key={conv.applicationId} conv={conv} />
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
