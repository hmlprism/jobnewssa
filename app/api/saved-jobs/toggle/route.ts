import { NextResponse } from "next/server";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 30 toggles / user / minute.
  const rl = await checkRateLimit(`user:${user.id}`, 30, "1 m");
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests." },
      {
        status: 429,
        headers: rl.retryAfter ? { "Retry-After": String(rl.retryAfter) } : {},
      }
    );
  }

  let jobId: string | undefined;
  try {
    ({ jobId } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!jobId || typeof jobId !== "string") {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("saved_jobs")
    .select("job_id")
    .eq("user_id", user.id)
    .eq("job_id", jobId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("saved_jobs")
      .delete()
      .eq("user_id", user.id)
      .eq("job_id", jobId);
    return NextResponse.json({ saved: false });
  }

  await supabase
    .from("saved_jobs")
    .insert({ user_id: user.id, job_id: jobId });
  return NextResponse.json({ saved: true });
}
