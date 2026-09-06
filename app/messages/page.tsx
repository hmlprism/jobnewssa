import { redirect } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/footer";
import { createClient, getAuthUser } from "@/lib/supabase/server";

export const metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

// ── types ────────────────────────────────────────────────────────────────────

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

// ── helpers ───────────────────────────────────────────────────────────────────

function formatInboxTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgStart  = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays  = Math.round((todayStart.getTime() - msgStart.getTime()) / 86400000);

  if (diffDays === 0) {
    return d.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString("en-ZA", { weekday: "short" });
  return d.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

// Truncate to first line, max 80 chars
function previewBody(body: string): string {
  const firstLine = body.split("\n")[0];
  return firstLine.length > 80 ? firstLine.slice(0, 80) + "…" : firstLine;
}

// ── inbox data fetch ──────────────────────────────────────────────────────────

async function getInboxConversations(userId: string): Promise<ConversationSummary[]> {
  const supabase = await createClient();

  // Fetch all applications the user is party to (as applicant or job poster).
  // RLS enforces that only legitimate parties can read.
  const { data: rawApps } = await supabase
    .from("applications")
    .select(`
      id,
      applicant_id,
      applicant_profile:profiles!applicant_id (full_name),
      job:jobs!job_id (id, title, slug, posted_by, company_name_raw)
    `);

  const apps = rawApps ?? [];
  if (apps.length === 0) return [];

  const appIds = apps.map((a) => a.id);

  // Fetch all messages in those threads, newest first. The messages RLS policy
  // allows reading any message in a thread you're party to.
  const { data: rawMsgs } = await supabase
    .from("messages")
    .select("id, application_id, sender_id, body, created_at, read_at")
    .in("application_id", appIds)
    .order("created_at", { ascending: false });

  const allMsgs = rawMsgs ?? [];

  // Group messages by application_id (already sorted desc so first = latest).
  const msgByApp = new Map<string, typeof allMsgs>();
  for (const msg of allMsgs) {
    if (!msgByApp.has(msg.application_id)) msgByApp.set(msg.application_id, []);
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
    const applicantProfile = app.applicant_profile as unknown as { full_name: string | null } | null;
    const myRole: "applicant" | "employer" = app.applicant_id === userId ? "applicant" : "employer";
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

  // Sort by most recent message; threads with no messages sink to the bottom.
  conversations.sort((a, b) => {
    if (!a.lastAt && !b.lastAt) return 0;
    if (!a.lastAt) return 1;
    if (!b.lastAt) return -1;
    return b.lastAt.localeCompare(a.lastAt);
  });

  return conversations;
}

// ── sub-components ────────────────────────────────────────────────────────────

function ConversationRow({ conv }: { conv: ConversationSummary }) {
  const hasUnread = conv.unreadCount > 0;
  return (
    <Link
      href={`/applications/${conv.applicationId}/thread`}
      className={`group relative block border-b border-[var(--color-line)] px-4 py-4 hover:bg-[var(--color-paper)]/60 ${
        hasUnread ? "border-l-2 border-l-[var(--color-rust)] pl-3.5" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm ${hasUnread ? "font-semibold" : "font-medium"}`}>
            {conv.otherPartyName}
            <span className="mx-1.5 text-[var(--color-muted)] font-normal">·</span>
            <span className="font-normal">{conv.jobTitle}</span>
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
      <h2 className="mb-0 border-b border-[var(--color-line)] pb-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
        {label}
      </h2>
      <div className="divide-y-0">
        {conversations.map((conv) => (
          <ConversationRow key={conv.applicationId} conv={conv} />
        ))}
      </div>
    </section>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default async function MessagesPage() {
  const user = await getAuthUser();
  if (!user) redirect("/auth/login");

  const conversations = await getInboxConversations(user.id);

  const asSeeker   = conversations.filter((c) => c.myRole === "applicant");
  const asEmployer = conversations.filter((c) => c.myRole === "employer");
  const showRoleLabels = asSeeker.length > 0 && asEmployer.length > 0;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <h1 className="mb-8 font-display text-2xl">Messages</h1>

        {conversations.length === 0 ? (
          <div className="border border-[var(--color-line)] px-6 py-12 text-center">
            <p className="font-display text-lg">No conversations yet</p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Conversations start when an employer messages an applicant, or vice versa,
              after a job application is submitted.
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
          // User appears in both seeker and employer threads — group by role
          <div className="space-y-8">
            <ConversationGroup label="As job seeker" conversations={asSeeker} />
            <ConversationGroup label="As employer" conversations={asEmployer} />
          </div>
        ) : (
          // Common case: one role only — skip the role label
          <div>
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
