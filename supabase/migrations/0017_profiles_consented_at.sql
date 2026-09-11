-- Records when the user agreed to Terms & Conditions and Privacy Policy at signup.
-- Nullable for existing accounts created before the consent gate was added.
-- Written once at signup via handle_new_user() trigger; never updated after that.
--
-- How it flows:
--   1. Signup form sends consented_at in signUp({ options: { data: { ... } } })
--   2. Supabase stores it in auth.users.raw_user_meta_data
--   3. The updated trigger below reads it and writes it to the profiles row
--      at row-creation time — before the client receives the signUp response
--
-- Not added to the authenticated-role column grant from migration 0014:
-- consented_at is internal audit data, not needed by the client or getAuthProfile().

alter table profiles
  add column if not exists consented_at timestamptz;

-- Replace handle_new_user() to also capture consented_at from signup metadata.
-- All other behaviour is identical to the original (0001_init.sql).
create or replace function handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, full_name, role, consented_at)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'job_seeker'),
    case
      when new.raw_user_meta_data->>'consented_at' is not null
        then (new.raw_user_meta_data->>'consented_at')::timestamptz
      else null
    end
  );
  return new;
end;
$$ language plpgsql security definer;
