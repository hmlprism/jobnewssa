-- Emergency fix: handle_new_user() was failing because the function had no
-- explicit search_path, so the ::user_role cast (public schema type) could not
-- be resolved when the trigger fired via supabase_auth_admin (whose search_path
-- may not include public).
--
-- Fix: add SET search_path = public to the function and use the explicit
-- public.user_role type reference for belt-and-suspenders safety.
-- Also adds SET search_path as a security best practice for SECURITY DEFINER
-- functions (Supabase's own recommendation).
--
-- All logic is otherwise identical to 0017 — consented_at is still captured
-- from signup metadata and written to profiles.

create or replace function handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, consented_at)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    coalesce(
      (new.raw_user_meta_data->>'role')::public.user_role,
      'job_seeker'::public.user_role
    ),
    case
      when new.raw_user_meta_data->>'consented_at' is not null
        then (new.raw_user_meta_data->>'consented_at')::timestamptz
      else null
    end
  );
  return new;
end;
$$;
