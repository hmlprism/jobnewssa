import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/footer";
import { ProfileEditForm } from "@/components/profile/profile-edit-form";
import type { Profile } from "@/types/database";

export const metadata = { title: "My Profile" };

export default async function ProfileEditPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // select("*") returns all columns the authenticated role can see.
  // disability_status and ee_designation are revoked from the authenticated
  // role at the column-privilege level, so they are absent from this result.
  // They are fetched separately via a security-definer RPC that enforces
  // owner-only access at the database level.
  const [{ data: profile }, { data: sensitiveRows }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
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
