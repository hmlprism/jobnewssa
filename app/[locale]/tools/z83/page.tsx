import { SiteHeader } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/footer";
import { getAuthUser, createClient } from "@/lib/supabase/server";
import { Z83Wizard } from "@/components/z83/z83-wizard";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Z83DraftData } from "@/types/z83";

export const metadata = { title: "Z83 Form Filler — Job News SA" };

export default async function Z83Page() {
  const user = await getAuthUser();

  let initialDraft: Z83DraftData | null = null;

  if (user) {
    const supabase = await createClient();
    const { data: row } = await supabase
      .from("z83_drafts")
      .select("data")
      .eq("user_id", user.id)
      .maybeSingle();

    if (row?.data) {
      // The stored JSONB contains only Z83DraftData (non-sensitive fields).
      // Sensitive fields (dob, id_number, declarations, signatures) are always
      // blank on load — the user must re-enter them each session.
      initialDraft = row.data as Z83DraftData;
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link
          href="/tools"
          prefetch={false}
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-rust)]"
        >
          <ArrowLeft size={14} />
          Back to tools
        </Link>

        <h1 className="mt-6 mb-2 font-display text-3xl font-semibold">
          Z83 Form Filler
        </h1>
        <p className="mb-8 text-sm text-[var(--color-muted)]">
          Fill in the 2021 revised Z83 government application form online and
          download a print-ready PDF.{" "}
          {!user && (
            <>
              Your progress is not saved between sessions —{" "}
              <Link
                href="/auth/login"
                prefetch={false}
                className="underline hover:text-[var(--color-rust)]"
              >
                sign in
              </Link>{" "}
              to save your details for next time.
            </>
          )}
        </p>

        <Z83Wizard initialDraft={initialDraft} isLoggedIn={!!user} />
      </main>
      <SiteFooter />
    </>
  );
}
