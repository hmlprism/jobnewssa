-- Self-service account reactivation tokens.
--
-- When a banned/deactivated user requests reactivation, a single-use 24-hour
-- token is generated server-side. Only the SHA-256 hash of the raw token is
-- stored here; the raw token travels only inside the emailed link and is
-- never persisted. This mirrors the secure pattern used for password-reset
-- tokens in most auth systems.
--
-- Token storage: a separate table (not columns on profiles) because this is
-- ephemeral auth-flow data with its own TTL, not persistent user attributes.
--
-- Rule: ALL future SECURITY DEFINER functions must include SET search_path = public.

create table reactivation_tokens (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  token_hash  text        not null unique,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

-- No client-side access — all reads/writes use the service-role client only.
alter table reactivation_tokens enable row level security;

-- Fast token lookup; partial index on unused tokens only (used tokens are dead).
create index idx_reactivation_tokens_hash
  on reactivation_tokens(token_hash)
  where used_at is null;

-- Helper: look up the user_id for a deactivated account matching the given email.
-- Used by the reactivation-request endpoint so we never expose admin internals
-- and can query auth.users safely from a SECURITY DEFINER context.
-- Returns zero rows if the account does not exist or is not deactivated.
create or replace function public.find_deactivated_user_by_email(p_email text)
returns table(user_id uuid)
language sql
security definer
set search_path = public
as $$
  select p.id
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(u.email) = lower(p_email)
    and p.deactivated = true
  limit 1;
$$;
