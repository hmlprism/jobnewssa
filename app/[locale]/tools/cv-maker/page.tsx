import { SiteHeader } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/footer";
import { getAuthUser, getAuthProfile, createClient } from "@/lib/supabase/server";
import { CvWizard } from "@/components/cv-maker/cv-wizard";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { CvData } from "@/types/cv";
import type { Profile } from "@/types/database";

export const metadata = { title: "CV Maker — Job News SA" };

// Build initial CV data from the existing profile, so the user doesn't have
// to re-enter contact and qualification details they already provided.
function profileToCvPrefill(profile: Profile, email: string): CvData {
  const eduEntry =
    profile.qualification_title
      ? [
          {
            institution: "",
            qualification:
              profile.qualification_type
                ? `${profile.qualification_type} — ${profile.qualification_title}`
                : profile.qualification_title,
            year: "",
            nqf_level: profile.nqf_level ?? "",
          },
        ]
      : [];

  return {
    contact: {
      name: profile.full_name ?? "",
      email,
      phone: profile.phone ?? "",
      city: profile.city ?? "",
      province: profile.province ?? "",
      linkedin: "",
    },
    summary: profile.headline ?? "",
    work_experience: [],
    education: eduEntry,
    skills: {
      technical: profile.professional_registration
        ? [profile.professional_registration]
        : [],
      soft: [],
    },
    references_on_request: true,
    template: "broadsheet",
    include_photo: false,
  };
}

export default async function CvMakerPage() {
  const user = await getAuthUser();

  let initialData: CvData | null = null;
  let avatarUrl: string | null = null;

  if (user) {
    const [profile, supabase] = await Promise.all([
      getAuthProfile(),
      createClient(),
    ]);

    // Prefer a saved draft; fall back to profile pre-fill.
    const { data: draft } = await supabase
      .from("cv_drafts")
      .select("data")
      .eq("user_id", user.id)
      .maybeSingle();

    if (draft?.data) {
      initialData = draft.data as CvData;
    } else if (profile) {
      initialData = profileToCvPrefill(profile, user.email ?? "");
    }

    avatarUrl = (profile as Profile | null)?.avatar_url ?? null;
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
          CV Maker
        </h1>
        <p className="mb-8 text-[var(--color-muted)] text-sm">
          Build a clean, ATS-friendly CV and download it as a PDF.
          {!user && (
            <> Your progress is saved in this browser. </>
          )}
        </p>

        <CvWizard
          initialData={initialData}
          avatarUrl={avatarUrl}
          isLoggedIn={!!user}
        />
      </main>
      <SiteFooter />
    </>
  );
}
