import { SiteHeader } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/footer";
import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "South Africa job market news" };

const getCachedArticles = unstable_cache(
  async () => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase
      .from("news_articles")
      .select("*")
      .order("published_at", { ascending: false })
      .limit(30);
    return data ?? [];
  },
  ["news-articles"],
  { revalidate: 300, tags: ["news"] }
);

// One accent color per source outlet, drawn from existing design tokens.
// Daily Maverick → Ink (editorial authority; rust is reserved for CTAs/active states)
// Moneyweb       → Amber (financial/business)
// IOL            → Indigo (established broadsheet)
const SOURCE_ACCENT: Record<string, string> = {
  "Daily Maverick": "var(--color-ink)",
  "Moneyweb": "var(--color-amber)",
  "IOL": "var(--color-indigo)",
};

// Short label shown inside the no-image accent block.
const SOURCE_ABBR: Record<string, string> = {
  "Daily Maverick": "DM",
  "Moneyweb": "MW",
  "IOL": "IOL",
};

export default async function NewsPage() {
  const articles = await getCachedArticles();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-3xl">Job market news</h1>
        <p className="mt-2 text-[var(--color-muted)]">
          Labour market and hiring news relevant to South African job seekers,
          curated from public sources.
        </p>

        {!articles || articles.length === 0 ? (
          <div className="mt-10 border border-[var(--color-line)] px-6 py-16 text-center">
            <p className="font-display text-lg">No articles yet</p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              News ingestion hasn&apos;t been configured yet. See lib/news-ingest.ts.
            </p>
          </div>
        ) : (
          <div className="mt-10 border-t border-[var(--color-line)]">
            {articles.map((article) => {
              const accentColor =
                SOURCE_ACCENT[article.source_name as string] ?? "var(--color-ink)";
              const abbr =
                SOURCE_ABBR[article.source_name as string] ??
                (article.source_name as string).slice(0, 3).toUpperCase();

              return (
                <a
                  key={article.id}
                  href={article.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-4 border-b border-[var(--color-line)] py-5 hover:bg-[var(--color-paper-dim)]"
                >
                  {/* Text content */}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
                      {article.source_name} · {timeAgo(article.published_at)}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold leading-snug">
                      {article.title}
                    </h2>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                      {article.summary}
                    </p>
                  </div>

                  {/* Right slot: thumbnail when image_url present, source accent block otherwise */}
                  <div className="shrink-0">
                    {article.image_url ? (
                      <div>
                        {/* External RSS image; domain varies per source — using <img>, not next/image */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={article.image_url}
                          alt=""
                          loading="lazy"
                          width={112}
                          height={80}
                          className="h-20 w-28 object-cover"
                        />
                        <p className="mt-1 text-xs text-[var(--color-muted)]">
                          Image: {article.source_name}
                        </p>
                      </div>
                    ) : (
                      /* No image: solid source-colour block with outlet abbreviation */
                      <div
                        className="flex h-20 w-28 items-center justify-center"
                        style={{ background: accentColor }}
                        aria-hidden="true"
                      >
                        <span className="text-sm font-semibold tracking-widest text-[var(--color-paper)]">
                          {abbr}
                        </span>
                      </div>
                    )}
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
