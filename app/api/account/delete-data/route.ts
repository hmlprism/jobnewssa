import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST() {
  // Verify authenticated session
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const service = createServiceClient();

  // List storage objects before clearing DB so we know what to remove
  const [resumeList, avatarList] = await Promise.all([
    service.storage.from("resumes").list(userId),
    service.storage.from("avatars").list(userId),
  ]);

  // Best-effort storage deletion — proceed even if files are missing
  const removals: Promise<unknown>[] = [];
  if (resumeList.data?.length) {
    removals.push(
      service.storage
        .from("resumes")
        .remove(resumeList.data.map((f) => `${userId}/${f.name}`))
    );
  }
  if (avatarList.data?.length) {
    removals.push(
      service.storage
        .from("avatars")
        .remove(avatarList.data.map((f) => `${userId}/${f.name}`))
    );
  }
  await Promise.allSettled(removals);

  // Delete tool drafts — cv_drafts (0020, pending prod apply) and z83_drafts (0021,
  // applied). Best-effort: if a table doesn't exist yet the error is swallowed.
  await Promise.allSettled([
    service.from("cv_drafts").delete().eq("user_id", userId),
    service.from("z83_drafts").delete().eq("user_id", userId),
  ]);

  // Clear all profile-specific fields.
  // Service client bypasses RLS and can write disability_status / ee_designation
  // (those columns have SELECT revoked from authenticated, but not UPDATE).
  // id, role, full_name, and consented_at are intentionally preserved.
  const { error } = await service
    .from("profiles")
    .update({
      resume_url: null,
      avatar_url: null,
      phone: null,
      province: null,
      city: null,
      headline: null,
      nqf_level: null,
      qualification_title: null,
      qualification_type: null,
      professional_registration: null,
      work_authorization: null,
      disability_status: null,
      ee_designation: null,
      preferred_province: null,
      preferred_contract_type: null,
      desired_salary_min: null,
    })
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
