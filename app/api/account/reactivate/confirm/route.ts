import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { createHash } from "crypto";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const rawToken = searchParams.get("token");

  // Default locale prefix for redirects — this is an API route so we have no
  // locale context; /en/ is the default locale and always resolves correctly.
  const appOrigin = origin;

  if (!rawToken) {
    return NextResponse.redirect(`${appOrigin}/en/auth/login?reactivation=invalid`);
  }

  const tokenHash = hashToken(rawToken);
  const service = createServiceClient();

  // Fetch the token row — must exist, be unused, and not yet expired.
  const { data: tokenRow } = await service
    .from("reactivation_tokens")
    .select("id, user_id, expires_at")
    .eq("token_hash", tokenHash)
    .is("used_at", null)
    .maybeSingle();

  if (!tokenRow || new Date(tokenRow.expires_at as string) < new Date()) {
    return NextResponse.redirect(`${appOrigin}/en/auth/login?reactivation=expired`);
  }

  const userId = tokenRow.user_id as string;

  // Mark token used FIRST — prevents replay even if subsequent steps fail.
  await service
    .from("reactivation_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", tokenRow.id);

  // Restore the profile's active state.
  const { error: profileError } = await service
    .from("profiles")
    .update({ deleted_at: null, deactivated: false })
    .eq("id", userId);

  if (profileError) {
    console.error("[reactivate/confirm] profile update failed", profileError.message);
    return NextResponse.redirect(`${appOrigin}/en/auth/login?reactivation=error`);
  }

  // Un-ban the Supabase Auth user.
  // ban_duration: "none" removes the ban set by the delete-account route
  // (which used ban_duration: "876000h"). This is the documented reversal.
  const { error: unbanError } = await service.auth.admin.updateUserById(userId, {
    ban_duration: "none",
  });

  if (unbanError) {
    // Roll back the profile update so state stays consistent.
    await service
      .from("profiles")
      .update({ deleted_at: new Date().toISOString(), deactivated: true })
      .eq("id", userId);
    console.error("[reactivate/confirm] unban failed", unbanError.message);
    return NextResponse.redirect(`${appOrigin}/en/auth/login?reactivation=error`);
  }

  // Send a "you've been reactivated" confirmation for the user's own records.
  const { data: { user } } = await service.auth.admin.getUserById(userId);
  if (user?.email) {
    await sendEmail({
      to: user.email,
      subject: "Your Job News SA account has been reactivated",
      html: `
        <p>Hi,</p>
        <p>Your Job News SA account has been successfully reactivated. You can now
        <a href="${appOrigin}/en/auth/login" style="color:#be421c;">sign in</a> as normal.</p>
        <p>If you did not request this reactivation, please contact us immediately.</p>
      `,
    });
  }

  return NextResponse.redirect(`${appOrigin}/en/auth/reactivated`);
}
