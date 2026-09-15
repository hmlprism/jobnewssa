import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";
import { randomBytes, createHash } from "crypto";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Always return { ok: true } — never reveal to the caller whether the address
// exists or is deactivated (anti-enumeration). Rate-limiting is the only
// signal that something is being throttled.
export async function POST(request: Request) {
  // 3 requests per IP per hour — prevents spam to an address the caller
  // doesn't control (the link goes to the registered address, not the
  // caller-supplied one, so reactivation emails can't be weaponised).
  const ip = getClientIp(request);
  const rl = await checkRateLimit(`reactivate-req:${ip}`, 3, "1 h");
  if (!rl.allowed) {
    // Return 200 so the caller can't use 429 as a probe signal.
    return NextResponse.json({ ok: true });
  }

  let email: string;
  try {
    const body = await request.json();
    email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  } catch {
    return NextResponse.json({ ok: true });
  }

  if (!email || !email.includes("@")) {
    return NextResponse.json({ ok: true });
  }

  const service = createServiceClient();

  // Look up whether this email belongs to a deactivated account via a
  // SECURITY DEFINER function (migration 0024) that joins auth.users →
  // profiles. Returns zero rows if not found / not deactivated.
  const { data } = await service.rpc("find_deactivated_user_by_email", {
    p_email: email,
  });
  const rows = data as Array<{ user_id: string }> | null;
  const userId = rows?.[0]?.user_id;

  if (!userId) {
    // No deactivated account — silently succeed.
    return NextResponse.json({ ok: true });
  }

  // Invalidate any existing unused tokens for this user before issuing a new one.
  await service
    .from("reactivation_tokens")
    .delete()
    .eq("user_id", userId)
    .is("used_at", null);

  // Generate a cryptographically random 32-byte token; store only its hash.
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { error: insertError } = await service
    .from("reactivation_tokens")
    .insert({ user_id: userId, token_hash: tokenHash, expires_at: expiresAt });

  if (insertError) {
    console.error("[reactivate/request] token insert failed", insertError.message);
    return NextResponse.json({ ok: true });
  }

  // Derive the app origin from the request — works in both dev and production.
  const origin =
    request.headers.get("origin") ?? "https://jobnewssa.vercel.app";
  const confirmUrl = `${origin}/api/account/reactivate/confirm?token=${rawToken}`;

  await sendEmail({
    to: email,
    subject: "Reactivate your Job News SA account",
    html: `
      <p>Hi,</p>
      <p>We received a request to reactivate your Job News SA account.</p>
      <p style="margin: 24px 0;">
        <a href="${confirmUrl}"
           style="background:#be421c;color:#fff;padding:12px 20px;text-decoration:none;font-weight:500;">
          Reactivate my account
        </a>
      </p>
      <p>This link expires in 24 hours and can only be used once.</p>
      <p>If you did not request this, you can safely ignore this email — your account will remain deactivated.</p>
    `,
  });

  return NextResponse.json({ ok: true });
}
