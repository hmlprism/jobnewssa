-- 0022_jobs_filter_indexes.sql
-- Performance indexes for the /jobs filter and sort query patterns.
--
-- Audit finding: lib/jobs-query.ts uses four columns that have no index:
--   contract_type  — .eq("contract_type", filters.contract)
--   salary_min     — .gte("salary_min", ...)
--   is_remote      — .eq("is_remote", true)
--   expires_at     — .order("expires_at", ...) + .or("expires_at.gte.${today}")
--
-- Additionally, the dominant query pattern (status = 'published' + ORDER BY
-- posted_at DESC — used on every listing call) currently requires Postgres to
-- combine two separate single-column indexes via bitmap scan. A compound index
-- covers both in one scan and is the highest-priority addition here.
--
-- All five indexes use CREATE INDEX CONCURRENTLY so they build without a full
-- table lock and are safe to apply on the live production database.
-- IMPORTANT: CONCURRENTLY cannot run inside a transaction block; apply this
-- migration outside a transaction (supabase db push --no-transaction, or paste
-- each statement individually in the Supabase SQL editor).
--
-- Estimated build time on current row counts: < 1 second. Will grow linearly
-- with job volume but remains non-blocking regardless of table size.

-- 1. Compound index for the dominant listing query:
--    every search filters status = 'published' first, then sorts by posted_at.
--    Replaces the two-step bitmap scan over idx_jobs_status + idx_jobs_posted_at.
create index concurrently if not exists idx_jobs_status_posted_at
  on jobs (status, posted_at desc);

-- 2. Contract type filter — .eq("contract_type", filters.contract)
create index concurrently if not exists idx_jobs_contract_type
  on jobs (contract_type);

-- 3. Salary minimum filter — .gte("salary_min", n)
create index concurrently if not exists idx_jobs_salary_min
  on jobs (salary_min);

-- 4. Expires-at sort + filter for the "closing soon" sort tab:
--    .or("expires_at.gte.${today},expires_at.is.null") + .order("expires_at")
create index concurrently if not exists idx_jobs_expires_at
  on jobs (expires_at);

-- 5. Remote filter — partial index on the minority case (most jobs are NOT
--    remote). A full boolean index on a low-cardinality column wastes space
--    and is ignored by the planner for the false side anyway. The partial
--    index is small, fast to build, and used by .eq("is_remote", true).
create index concurrently if not exists idx_jobs_is_remote
  on jobs (id) where is_remote = true;
