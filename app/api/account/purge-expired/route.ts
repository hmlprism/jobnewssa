import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// Same auth pattern as /api/jobs/ingest — Vercel Cron sends this header.
function isAuthorized(request: Request): boolean {
  return (
    request.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`
  );
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();

  // 30-day grace period: find profiles soft-deleted more than 30 days ago
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: expired, error: queryError } = await service
    .from("profiles")
    .select("id")
    .not("deleted_at", "is", null)
    .lt("deleted_at", cutoff);

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 });
  }

  let purged = 0;
  const errors: string[] = [];

  for (const { id: userId } of expired ?? []) {
    // Delete all storage objects for this user — best-effort
    const [resumeList, avatarList] = await Promise.all([
      service.storage.from("resumes").list(userId),
      service.storage.from("avatars").list(userId),
    ]);
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

    // Hard-delete the auth.users row.
    // profiles.id references auth.users(id) ON DELETE CASCADE, so the profile
    // and all child rows (applications, messages, saved_jobs, etc.) cascade.
    const { error: deleteError } = await service.auth.admin.deleteUser(userId);
    if (deleteError) {
      errors.push(`${userId}: ${deleteError.message}`);
    } else {
      purged++;
    }
  }

  return NextResponse.json({
    checked: (expired ?? []).length,
    purged,
    errors,
  });
}

// Vercel Cron invokes scheduled paths via GET with the Authorization header
// set automatically — must run the same authenticated logic as POST.
export async function GET(request: Request) {
  return POST(request);
}
