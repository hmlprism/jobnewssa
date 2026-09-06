import Link from "next/link";
import { LinkButton } from "@/components/ui/button";
import { getAuthUser, getAuthProfile, createClient } from "@/lib/supabase/server";
import { UserMenu } from "@/components/layout/user-menu";
import { MobileNav } from "@/components/layout/mobile-nav";

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
    <header className="sticky top-0 z-30 border-b border-[var(--color-line)] bg-[var(--color-paper)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center bg-[var(--color-ink)] font-display text-sm font-bold text-[var(--color-paper)]">
            JN
          </span>
          <span className="font-display text-lg font-semibold tracking-tight sm:text-xl">
            Job News SA
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          <NavLink href="/jobs">Find jobs</NavLink>
          <NavLink href="/news">News</NavLink>
          <NavLink href="/employer/post">Post a job</NavLink>
          {user && (
            <NavLink href="/messages">
              Messages
              {unreadCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center bg-[var(--color-rust)] px-1.5 py-px text-[10px] font-bold leading-none text-[var(--color-paper)]">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </NavLink>
          )}
        </nav>

        {/* Right side: auth controls + mobile hamburger */}
        <div className="flex items-center gap-3">
          {user ? (
            <UserMenu
              email={user.email ?? ""}
              name={user.user_metadata?.full_name}
              role={role}
            />
          ) : (
            <div className="hidden items-center gap-3 sm:flex">
              <Link
                href="/auth/login"
                className="text-sm font-medium text-[var(--color-ink)] hover:text-[var(--color-rust)]"
              >
                Sign in
              </Link>
              <LinkButton href="/auth/signup" size="sm">
                Create free account
              </LinkButton>
            </div>
          )}
          <MobileNav isLoggedIn={!!user} unreadCount={unreadCount} />
        </div>
      </div>
    </header>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center px-3 py-2 text-sm font-medium text-[var(--color-ink)] hover:text-[var(--color-rust)]"
    >
      {children}
    </Link>
  );
}
