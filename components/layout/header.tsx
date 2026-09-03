import Link from "next/link";
import { LinkButton } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { UserMenu } from "@/components/layout/user-menu";

export async function SiteHeader() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let role: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    role = profile?.role ?? null;
  }

  return (
    <header className="border-b border-[var(--color-line)] bg-[var(--color-paper)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="font-display text-xl font-semibold tracking-tight">
          Mzansi Works
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
