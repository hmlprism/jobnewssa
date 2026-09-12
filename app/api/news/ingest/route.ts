import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { RSS_FEEDS, parseRssFeed, isEmploymentRelevant } from "@/lib/news-feeds";

function isAuthorized(request: Request): boolean {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

export async function runNewsIngestion() {
  const supabase = createServiceClient();

  let totalIngested = 0;
  let totalSkipped = 0;   // duplicate source_url — already in DB
  let totalFiltered = 0;  // failed keyword filter
  const ingested: { title: string; source: string }[] = [];
  const errors: string[] = [];

  for (const feed of RSS_FEEDS) {
    let xml: string;

    try {
      const res = await fetch(feed.url, {
        signal: AbortSignal.timeout(15_000),
        headers: {
          // Identify the bot politely; some servers reject requests without UA
          "User-Agent":
            "Mozilla/5.0 (compatible; JobNewsSA/1.0; +https://jobnewssa.vercel.app)",
        },
      });
      if (!res.ok) {
        errors.push(`${feed.sourceName}: HTTP ${res.status}`);
        continue;
      }
      xml = await res.text();
    } catch (e) {
      errors.push(`${feed.sourceName}: fetch failed — ${(e as Error).message}`);
      continue;
    }

    const items = parseRssFeed(xml);

    for (const item of items) {
      if (!isEmploymentRelevant(item.title, item.summary)) {
        totalFiltered++;
        continue;
      }

      const { error } = await supabase.from("news_articles").insert({
        title: item.title,
        slug: null,
        summary: item.summary || item.title, // summary is NOT NULL; fall back to title if empty
        source_name: feed.sourceName,
        source_url: item.sourceUrl,
        image_url: item.imageUrl,
        published_at: item.publishedAt,
        category: item.category,
        // ingested_at defaults to now() — not set explicitly
      });

      if (error) {
        if (error.code === "23505") {
          // Unique constraint on source_url — article already stored, skip silently
          totalSkipped++;
        } else {
          errors.push(
            `${feed.sourceName} — "${item.title.slice(0, 60)}": ${error.message}`
          );
        }
      } else {
        totalIngested++;
        ingested.push({ title: item.title, source: feed.sourceName });
      }
    }
  }

  return {
    ingested: totalIngested,
    already_existed: totalSkipped,
    filtered_out: totalFiltered,
    feeds_processed: RSS_FEEDS.length,
    articles: ingested,
    errors: errors.length ? errors : undefined,
  };
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await runNewsIngestion());
}

// Allow unauthenticated GET in development only.
// Visit http://localhost:3000/api/news/ingest in the browser to trigger a manual run.
// Same pattern as /api/jobs/ingest.
export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Use POST with cron secret" }, { status: 405 });
  }
  return NextResponse.json(await runNewsIngestion());
}
