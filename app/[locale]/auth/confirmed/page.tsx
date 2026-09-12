import Image from "next/image";
import { LinkButton } from "@/components/ui/button";
import { getAuthUser } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";

export default async function ConfirmedPage() {
  const [user, t] = await Promise.all([
    getAuthUser(),
    getTranslations("Auth"),
  ]);

  return (
    <main className="w-full max-w-md px-4 py-16 sm:px-6">
      <div className="border border-[var(--color-line)] bg-[var(--color-paper)] p-8 text-center sm:p-10">
        <Image
          src="/logo-mark.png"
          alt={t("logoAlt")}
          width={455}
          height={450}
          className="mx-auto mb-5 h-10 w-auto"
        />
        <h1 className="font-display text-2xl font-semibold">
          {t("confirmed.title")}
        </h1>
        {user ? (
          <>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              {t("confirmed.signedInBody")}
            </p>
            <div className="mt-6">
              <LinkButton href="/jobs" className="w-full justify-center">
                {t("confirmed.browseJobs")}
              </LinkButton>
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              {t("confirmed.notSignedInBody")}
            </p>
            <div className="mt-6">
              <LinkButton href="/auth/login" className="w-full justify-center">
                {t("confirmed.signIn")}
              </LinkButton>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
