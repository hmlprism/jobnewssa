import Link from "next/link";
import { LinkButton } from "@/components/ui/button";
import { getAuthUser, getAuthProfile, createClient } from "@/lib/supabase/server";
import { UserMenu } from "@/components/layout/user-menu";

// Counts messages in the user's threads that were sent by someone else and
// haven't been opened yet. Runs in parallel with getAuthProfile() so it adds
// no extra serial latency to the header render.
async function getUnreadCount(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .neq("sender_id", userId)
    .is("read_at", null);
  return count ?? 0;
}

export async function SiteHeader() {
  const user = await getAuthUser();

  const [profile, unreadCount] = await Promise.all([
    user ? getAuthProfile() : Promise.resolve(null),
    user ? getUnreadCount(user.id) : Promise.resolve(0),
  ]);

  const role = profile?.role ?? null;

  return (
    <header className="border-b border-[var(--color-line)] bg-[var(--color-paper)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="font-display text-xl font-semibold tracking-tight">
          Job News SA
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-[var(--color-ink)] md:flex">
          <Link href="/jobs" className="hover:text-[var(--color-rust)]">
            Find jobs
          </Link>
          <Link href="/news" className="hover:text-[var(--color-rust)]">
            Job market news
          </Link>
          <Link href="/employer/post" className="hover:text-[var(--color-rust)]">
            Post a job
          </Link>
          {user && (
            <Link
              href="/messages"
              className="flex items-center gap-1 hover:text-[var(--color-rust)]"
            >
              Messages
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center bg-[var(--color-rust)] px-1.5 py-px text-[10px] font-bold leading-none text-[var(--color-paper)]">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <UserMenu
              email={user.email ?? ""}
              name={user.user_metadata?.full_name}
              role={role}
            />
          ) : (
            <>
              <Link
                href="/auth/login"
                className="hidden text-sm font-medium hover:text-[var(--color-rust)] sm:block"
              >
                Sign in
              </Link>
              <LinkButton href="/auth/signup" size="sm">
                Create free account
              </LinkButton>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
