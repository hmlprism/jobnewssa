// Auto-save Z83 draft for logged-in users.
// PUT (upsert) — called on every step navigation.
//
// SECURITY: this route strips ALL sensitive fields before the upsert.
// id_number, dob, section_b_declarations, signatures, and declaration_date
// are NEVER written to z83_drafts.data, even if the client sends them.
import { type NextRequest, NextResponse } from "next/server";
import { getAuthUser, createClient } from "@/lib/supabase/server";
import type { Z83DraftData } from "@/types/z83";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Exhaustive allowlist of storable keys — anything not listed is silently dropped.
const DRAFT_KEYS: ReadonlyArray<keyof Z83DraftData> = [
  "section_a",
  "section_b",
  "section_d",
  "section_e",
  "section_e_current",
  "section_f",
  "section_f_ps_reappointment",
  "section_g",
];

export async function PUT(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 60 auto-saves / user / minute — generous to cover rapid step navigation.
  const rl = await checkRateLimit(`user:${user.id}`, 60, "1 m");
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests." },
      {
        status: 429,
        headers: rl.retryAfter ? { "Retry-After": String(rl.retryAfter) } : {},
      }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // Build persistable from the allowlist — sensitive keys are never present.
  const raw = body as Record<string, unknown>;
  const persistable: Partial<Z83DraftData> = {};
  for (const key of DRAFT_KEYS) {
    if (key in raw) {
      (persistable as Record<string, unknown>)[key] = raw[key];
    }
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("z83_drafts")
    .upsert({ user_id: user.id, data: persistable }, { onConflict: "user_id" });

  if (error) {
    console.error("[z83/draft] upsert error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
