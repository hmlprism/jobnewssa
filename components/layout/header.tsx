import { Suspense } from "react";
import Link from "next/link";
import { LinkButton } from "@/components/ui/button";
import { getAuthUser, getAuthProfile, createClient } from "@/lib/supabase/server";
import { UserMenu } from "@/components/layout/user-menu";
import { MobileNav } from "@/components/layout/mobile-nav";

export function SiteHeader() {
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
          <Suspense fallback={<AuthNavItemsSkeleton />}>
            <AuthNavItems />
          </Suspense>
        </nav>

        {/* Right side: auth controls + mobile hamburger */}
        <div className="flex items-center gap-3">
          <Suspense fallback={<AuthControlsSkeleton />}>
            <AuthControls />
          </Suspense>
        </div>
      </div>
    </header>
  );
}

async function AuthNavItems() {
  const user = await getAuthUser();
  if (!user) return null;

  // Fetch unread count server-side — piggybacks on the already-resolved auth
  // session. Eliminates the client-side fetch + its middleware auth round-trip.
  const supabase = await createClient();
  const { count } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .neq("sender_id", user.id)
    .is("read_at", null);

  return (
    <NavLink href="/messages">
      Messages
      {count != null && count > 0 && (
        <span className="ml-1.5 inline-flex items-center justify-center bg-[var(--color-rust)] px-1.5 py-px text-[10px] font-bold leading-none text-[var(--color-paper)]">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </NavLink>
  );
}

async function AuthControls() {
  const user = await getAuthUser();
  const profile = user ? await getAuthProfile() : null;
  const role = profile?.role ?? null;

  // Pass unread count to MobileNav so it can show badge without client fetch
  let unreadCount = 0;
  if (user) {
    const supabase = await createClient();
    const { count } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .neq("sender_id", user.id)
      .is("read_at", null);
    unreadCount = count ?? 0;
  }

  return (
    <>
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
    </>
  );
}

function AuthNavItemsSkeleton() {
  // Reserve space matching the "Messages" NavLink so the nav doesn't shift.
  return <span className="inline-block min-w-[86px] px-3 py-2" aria-hidden />;
}

function AuthControlsSkeleton() {
  return (
    <>
      {/* Placeholder matching UserMenu approximate size */}
      <div className="hidden sm:block">
        <div className="h-8 w-20 animate-pulse bg-[var(--color-line)]" />
      </div>
      {/* Mobile hamburger placeholder */}
      <div className="md:hidden">
        <div className="h-6 w-6 animate-pulse bg-[var(--color-line)]" />
      </div>
    </>
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
