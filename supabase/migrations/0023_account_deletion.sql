-- Account soft-delete with 30-day grace period.
--
-- deleted_at: set when the user requests account deletion; the purge cron
--   (/api/account/purge-expired, daily) hard-deletes rows where
--   deleted_at < now() - interval '30 days'.
-- deactivated: set alongside deleted_at; also enforced via a Supabase Auth
--   ban (876000h) so the user cannot log back in during the grace period.
--
-- Rule: ALL future SECURITY DEFINER functions must include SET search_path = public.

alter table profiles
  add column deleted_at  timestamptz,
  add column deactivated boolean not null default false;

-- Existing RLS (0014) revoked blanket SELECT and re-granted per-column.
-- New columns must be explicitly granted to the roles that need them.
-- anon has no need to read deletion state; authenticated can read their own.
grant select (deleted_at, deactivated) on profiles to authenticated;

-- Partial index — only rows with a deletion timestamp; keeps the purge
-- query O(soft-deleted count), not O(all profiles).
create index idx_profiles_deleted_at
  on profiles(deleted_at)
  where deleted_at is not null;
