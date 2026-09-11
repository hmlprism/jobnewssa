-- Prepare news_articles for automated RSS ingestion.
--
-- 1. slug DROP NOT NULL — slug was designed for a manual CMS workflow where an editor
--    assigns a slug. RSS-ingested items have no natural slug, and the /news page
--    navigates directly to source_url (the feed's <link> field) — it never routes
--    to /news/:slug. Making it nullable is non-breaking: the public-select RLS
--    policy is unchanged; the page query selects all columns and renders none of
--    them via slug.
--
-- 2. source_url UNIQUE — enables ON CONFLICT (source_url) DO NOTHING so re-running
--    the cron on the same feed never creates duplicate rows. A canonical article URL
--    is stable and unique across all sources; simpler and more reliable than hashing.
--
-- 3. ingested_at — tracks when the row was pulled from the feed, independent of
--    published_at. Defaults to now() so existing manual rows are unaffected.
--
-- No RLS changes: the ingest route uses createServiceClient() (service role) which
-- bypasses RLS. The existing public-select-only policy on news_articles is correct
-- and unchanged.

alter table news_articles
  alter column slug drop not null;

alter table news_articles
  add constraint news_articles_source_url_unique unique (source_url);

alter table news_articles
  add column if not exists ingested_at timestamptz not null default now();
