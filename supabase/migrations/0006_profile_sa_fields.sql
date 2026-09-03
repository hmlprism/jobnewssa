-- SA-specific profile fields + column-level security for sensitive EE data

-- ============================================================
-- PROFILES: new columns
-- ============================================================
alter table profiles
  add column nqf_level               text,
  add column qualification_title     text,
  add column qualification_type      text,
  add column professional_registration text,
  add column work_authorization      text
    check (work_authorization in ('citizen', 'permanent_resident', 'work_permit', 'other')),
  add column disability_status       text,   -- PRIVATE: owner-only via security definer
  add column ee_designation          text,   -- PRIVATE: owner-only via security definer
  add column preferred_province      text,
  add column preferred_contract_type contract_type,
  add column desired_salary_min      numeric;

-- Partial indexes to support future candidate-matching queries
create index idx_profiles_preferred_province on profiles(preferred_province)
  where preferred_province is not null;
create index idx_profiles_preferred_contract on profiles(preferred_contract_type)
  where preferred_contract_type is not null;
create index idx_profiles_desired_salary on profiles(desired_salary_min)
  where desired_salary_min is not null;

-- ============================================================
-- RLS: enforce column-level security on disability_status and ee_designation
--
-- PostgreSQL RLS is row-level only; column-level restriction requires
-- revoking column SELECT privileges from the PostgREST roles (anon,
-- authenticated). PostgREST respects these grants and omits the
-- columns from select *.  A SECURITY DEFINER function then lets
-- the profile owner — and only the owner — read their own values.
-- ============================================================

-- Drop the existing blanket SELECT policy so we can replace it
drop policy "Profiles are viewable by everyone" on profiles;

-- Recreate with the same row-level behaviour (all rows visible);
-- column-level restriction is enforced by privileges below
create policy "Profiles are viewable by everyone"
  on profiles for select using (true);

-- Revoke sensitive-column SELECT from both PostgREST roles
revoke select (disability_status, ee_designation) on profiles from anon;
revoke select (disability_status, ee_designation) on profiles from authenticated;

-- Security-definer function: runs as the table owner (postgres),
-- so it can read the revoked columns — but only returns the
-- calling user's own row via auth.uid().
create or replace function get_my_sensitive_profile_fields()
  returns table(disability_status text, ee_designation text)
  language sql
  security definer
  set search_path = public
  stable
as $$
  select p.disability_status, p.ee_designation
  from profiles p
  where p.id = auth.uid();
$$;

grant execute on function get_my_sensitive_profile_fields() to authenticated;
