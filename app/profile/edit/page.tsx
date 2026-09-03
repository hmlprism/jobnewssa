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

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <h1 className="mb-8 font-display text-2xl">My profile</h1>
        <ProfileEditForm profile={profile as Profile} userId={user.id} />
      </main>
      <SiteFooter />
    </>
  );
}
