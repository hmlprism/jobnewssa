import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  // 1. Auth check using the session cookie
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse body
  let websiteUrl: string;
  try {
    const body = await request.json();
    websiteUrl = body.websiteUrl;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!websiteUrl || typeof websiteUrl !== "string") {
    return NextResponse.json({ error: "websiteUrl is required" }, { status: 400 });
  }

  // 3. Normalise and parse the URL
  const trimmed = websiteUrl.trim();
  let hostname: string;
  try {
    const parsed = new URL(
      trimmed.startsWith("http") ? trimmed : `https://${trimmed}`
    );
    hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
  }

  // 4. Check the domain resolves (any HTTP response counts — we just need DNS+TCP)
  try {
    await fetch(`https://${hostname}`, {
      method: "HEAD",
      signal: AbortSignal.timeout(6000),
    });
  } catch {
    return NextResponse.json({
      verified: false,
      reason: "domain_unreachable",
      message:
        "We couldn't reach that website. Check the URL and try again.",
    });
  }

  // 5. Compare email domain to website domain
  const emailDomain = user.email.split("@")[1].toLowerCase();
  const domainsMatch =
    emailDomain === hostname ||
    emailDomain.endsWith(`.${hostname}`) ||
    hostname.endsWith(`.${emailDomain}`);

  if (!domainsMatch) {
    return NextResponse.json({
      verified: false,
      reason: "domain_mismatch",
      message: `Your account email domain (${emailDomain}) doesn't match the website domain (${hostname}). Manual review isn't available yet — your jobs will continue to post as unverified.`,
    });
  }

  // 6. Find the employer's company (use service client to bypass RLS on the write)
  const service = createServiceClient();
  const { data: company, error: fetchError } = await service
    .from("companies")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (fetchError || !company) {
    return NextResponse.json(
      { error: "No company found. Post a job first to create your company profile." },
      { status: 404 }
    );
  }

  // 7. Mark verified
  const { error: updateError } = await service
    .from("companies")
    .update({
      verified: true,
      verification_method: "email_domain_match",
      verified_at: new Date().toISOString(),
    })
    .eq("id", company.id);

  if (updateError) {
    return NextResponse.json({ error: "Update failed. Try again." }, { status: 500 });
  }

  return NextResponse.json({ verified: true });
}
