import { Suspense } from "react";
import Image from "next/image";
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
        <Link href="/" prefetch={false} className="flex items-center gap-2.5">
          <Image
            src="/logo-mark.png"
            alt="Job News SA"
            width={455}
            height={450}
            className="h-8 w-auto"
            priority
          />
          <Image
            src="/logo-wordmark.png"
            alt=""
            width={1445}
            height={260}
            className="hidden sm:block h-6 w-auto"
            priority
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-0.5 lg:flex">
          <NavLink href="/">Home</NavLink>
          <NavLink href="/jobs">Find Jobs</NavLink>
          <NavLink href="/tools">Tools</NavLink>
          <NavLink href="/saved">Saved</NavLink>
          <NavLink href="/applications">Applications</NavLink>
          <NavLink href="/news">News</NavLink>
          <Suspense fallback={<AuthNavItemsSkeleton />}>
            <AuthNavItems />
          </Suspense>
          {/* Hairline — seeker nav / employer CTA */}
          <span className="mx-1.5 h-3.5 w-px bg-[var(--color-line)]" aria-hidden />
          <NavLink href="/employer/post">Post a Job</NavLink>
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

  if (!user) {
    return (
      <>
        <div className="hidden items-center gap-3 sm:flex">
          <Link
            href="/auth/login"
            prefetch={false}
            className="text-sm font-medium text-[var(--color-muted)] transition-colors duration-100 hover:text-[var(--color-ink)]"
          >
            Sign in
          </Link>
          <LinkButton href="/auth/signup" size="sm">
            Create account
          </LinkButton>
        </div>
        <MobileNav isLoggedIn={false} unreadCount={0} />
      </>
    );
  }

  // Run profile and unread-count queries in parallel — previously sequential,
  // costing profiles_time + messages_time ≈ 200ms; now max of the two ≈ 100ms.
  const supabase = await createClient();
  const [profile, { count }] = await Promise.all([
    getAuthProfile(),
    supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .neq("sender_id", user.id)
      .is("read_at", null),
  ]);

  return (
    <>
      <UserMenu
        email={user.email ?? ""}
        name={user.user_metadata?.full_name}
        role={profile?.role ?? null}
      />
      <MobileNav isLoggedIn={true} unreadCount={count ?? 0} />
    </>
  );
}

function AuthNavItemsSkeleton() {
  return <span className="inline-block min-w-[86px] px-3 py-2" aria-hidden />;
}

function AuthControlsSkeleton() {
  return (
    <>
      <div className="hidden sm:block">
        <div className="h-8 w-20 animate-pulse bg-[var(--color-line)]" />
      </div>
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
      prefetch={false}
      className="flex items-center px-2.5 py-2 text-sm font-medium text-[var(--color-muted)] transition-colors duration-100 hover:text-[var(--color-ink)]"
    >
      {children}
    </Link>
  );
}
