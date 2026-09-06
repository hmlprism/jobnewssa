import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/footer";
import { getAuthUser, getAuthProfile } from "@/lib/supabase/server";
import { AccountSettingsForm } from "@/components/account/account-settings-form";
import type { Profile } from "@/types/database";

export const metadata = { title: "Account Settings" };

export default async function AccountSettingsPage() {
  const user = await getAuthUser();
  if (!user) redirect("/auth/login");

  const profile = await getAuthProfile() as Profile | null;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <h1 className="mb-8 font-display text-2xl">Account settings</h1>
        <AccountSettingsForm
          userId={user.id}
          email={user.email ?? ""}
          initialName={profile?.full_name ?? null}
          initialAvatarUrl={profile?.avatar_url ?? null}
        />
      </main>
      <SiteFooter />
    </>
  );
}
