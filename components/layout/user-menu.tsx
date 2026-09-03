"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function UserMenu({ email, name, role }: { email: string; name?: string; role?: string | null }) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/");
  }

  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-sm font-medium text-[var(--color-ink)] sm:block">
        {name ?? email}
      </span>
      {role === "employer" && (
        <Link
          href="/employer/dashboard"
          className="hidden text-sm font-medium hover:text-[var(--color-rust)] sm:block"
        >
          Dashboard
        </Link>
      )}
      <Link
        href="/profile/edit"
        className="hidden text-sm font-medium hover:text-[var(--color-rust)] sm:block"
      >
        My Profile
      </Link>
      <Button variant="ghost" size="sm" onClick={handleSignOut}>
        Sign out
      </Button>
    </div>
  );
}
