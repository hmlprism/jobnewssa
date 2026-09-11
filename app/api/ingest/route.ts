/**
 * Combined daily ingestion endpoint — Adzuna jobs + news RSS.
 *
 * Replaces the two separate daily cron entries (which used both Hobby-plan
 * slots) with a single combined endpoint, freeing the second slot for the
 * weekly DPSA circular cron.
 *
 * Both sources run concurrently; a failure in one does not abort the other.
 *
 * Cron schedule: 0 3 * * *  (03:00 UTC daily)
 */

import { NextResponse } from "next/server";
import { runAdzunaIngestion } from "@/app/api/jobs/ingest/route";
import { runNewsIngestion } from "@/app/api/news/ingest/route";

function isAuthorized(request: Request): boolean {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [adzuna, news] = await Promise.allSettled([
    runAdzunaIngestion(),
    runNewsIngestion(),
  ]);

  return NextResponse.json({
    adzuna: adzuna.status === "fulfilled" ? adzuna.value : { error: (adzuna as PromiseRejectedResult).reason?.message },
    news:   news.status   === "fulfilled" ? news.value   : { error: (news   as PromiseRejectedResult).reason?.message },
  });
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Use POST with cron secret" }, { status: 405 });
  }
  return POST(request);
}
