import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { SiteHeader } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/footer";
import { getAuthUser, getAuthProfile } from "@/lib/supabase/server";
import { AccountSettingsForm } from "@/components/account/account-settings-form";
import type { Profile } from "@/types/database";

export async function generateMetadata() {
  const t = await getTranslations("AccountSettings.page");
  return { title: t("title") };
}

export default async function AccountSettingsPage() {
  const [user, locale, t] = await Promise.all([getAuthUser(), getLocale(), getTranslations("AccountSettings.page")]);
  if (!user) redirect(`/${locale}/auth/login`);

  const profile = (await getAuthProfile()) as Profile | null;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-12">
        <h1 className="mb-8 font-display text-2xl font-semibold">
          {t("title")}
        </h1>
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
