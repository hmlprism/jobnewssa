// Auto-save CV draft for logged-in users.
// PUT (upsert) — called from the wizard on every step navigation.
// The cv_drafts table has a UNIQUE constraint on user_id so we can use
// ON CONFLICT to upsert without knowing whether a row exists yet.
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, createClient } from "@/lib/supabase/server";
import type { CvData } from "@/types/cv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let data: CvData;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Strip display-only fields before persisting — these are never stored.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id_number: _, photo_url: __, ...persistable } = data as CvData & {
    id_number?: string;
    photo_url?: string | null;
  };

  const supabase = await createClient();
  const { error } = await supabase.from("cv_drafts").upsert(
    { user_id: user.id, data: persistable },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("[cv/draft] upsert error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
