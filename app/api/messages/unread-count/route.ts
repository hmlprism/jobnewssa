import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  // Use getSession() instead of getUser() — middleware already validated +
  // refreshed the session on this request, so the cookies are trustworthy.
  // This avoids a redundant network round-trip to Supabase Auth.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return NextResponse.json({ count: 0 });
  }

  const { count } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .neq("sender_id", session.user.id)
    .is("read_at", null);

  return NextResponse.json({ count: count ?? 0 });
}
