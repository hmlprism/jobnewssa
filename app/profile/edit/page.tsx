import { createClient, getAuthUser, getAuthProfile } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/footer";
import { ProfileEditForm } from "@/components/profile/profile-edit-form";
import type { Profile } from "@/types/database";

export const metadata = { title: "My Profile" };

export default async function ProfileEditPage() {
  const user = await getAuthUser();
  if (!user) redirect("/auth/login");

  // getAuthProfile() is memoised for this request — the result is shared with
  // SiteHeader so the DB query only runs once. The RPC fetches the two
  // column-privilege-restricted fields that select("*") cannot return.
  const supabase = await createClient();
  const [profile, { data: sensitiveRows }] = await Promise.all([
    getAuthProfile(),
    supabase.rpc("get_my_sensitive_profile_fields").maybeSingle(),
  ]);

  const fullProfile: Profile = {
    ...(profile as Profile),
    disability_status: (sensitiveRows as { disability_status: string | null } | null)?.disability_status ?? null,
    ee_designation: (sensitiveRows as { ee_designation: string | null } | null)?.ee_designation ?? null,
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <h1 className="mb-8 font-display text-2xl">My profile</h1>
        <ProfileEditForm profile={fullProfile} userId={user.id} />
      </main>
      <SiteFooter />
    </>
  );
}
