/**
 * Minimal transactional email helper — raw fetch to the Resend API, no SDK.
 *
 * Required env vars (set in Vercel dashboard):
 *   RESEND_API_KEY  — from resend.com dashboard (free tier: 3 000 emails/month)
 *   EMAIL_FROM      — verified sender address, e.g.
 *                     "Job News SA <noreply@jobnewssa.co.za>"
 *                     Falls back to Resend's sandbox address in dev/staging
 *                     (only delivers to the account owner's verified email).
 *
 * Fail-open: if RESEND_API_KEY is not set the call logs a warning and returns
 * without throwing, so the surrounding flow always completes.
 */

const RESEND_URL = "https://api.resend.com/emails";

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — skipping email to", to);
    return;
  }

  const from =
    process.env.EMAIL_FROM ?? "Job News SA <onboarding@resend.dev>";

  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[email] Resend error", res.status, text);
  }
}
