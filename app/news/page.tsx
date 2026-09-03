import { SiteHeader } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/footer";
import { createClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/utils";

export const metadata = { title: "South Africa job market news" };

export default async function NewsPage() {
  const supabase = await createClient();
  const { data: articles } = await supabase
    .from("news_articles")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(30);

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
            {articles.map((article) => (
              <a
                key={article.id}
                href={article.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block border-b border-[var(--color-line)] py-5 hover:bg-[var(--color-paper-dim)]"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
                  {article.source_name} · {timeAgo(article.published_at)}
                </p>
                <h2 className="mt-1 text-lg font-semibold">{article.title}</h2>
                <p className="mt-1 text-sm text-[var(--color-muted)]">{article.summary}</p>
              </a>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
