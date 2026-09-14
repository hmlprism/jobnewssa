import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const service = createServiceClient();

  // Soft-delete: mark the profile with timestamp and deactivated flag
  const { error: profileError } = await service
    .from("profiles")
    .update({ deleted_at: new Date().toISOString(), deactivated: true })
    .eq("id", userId);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // Ban the user at the Supabase Auth level — prevents immediate re-login
  // without requiring a per-request DB check in middleware.
  // 876000h ≈ 100 years; the purge job hard-deletes before this expires.
  const { error: banError } = await service.auth.admin.updateUserById(userId, {
    ban_duration: "876000h",
  });

  if (banError) {
    // Roll back the profile update so state stays consistent
    await service
      .from("profiles")
      .update({ deleted_at: null, deactivated: false })
      .eq("id", userId);
    return NextResponse.json({ error: banError.message }, { status: 500 });
  }

  // Return OK — the client signs out and redirects after this
  return NextResponse.json({ ok: true });
}
