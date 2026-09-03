"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function UserMenu({ email, name }: { email: string; name?: string }) {
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
