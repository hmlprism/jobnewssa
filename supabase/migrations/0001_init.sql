-- SA Jobs: initial schema
-- Run in Supabase SQL editor or via `supabase db push`

create extension if not exists "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
create type user_role as enum ('job_seeker', 'employer', 'admin');
create type contract_type as enum ('permanent', 'part_time', 'temporary', 'contract', 'internship', 'volunteer');
create type job_source as enum ('adzuna', 'manual', 'employer_direct');
create type job_status as enum ('draft', 'pending_review', 'published', 'expired', 'rejected');
create type application_status as enum ('submitted', 'viewed', 'shortlisted', 'rejected', 'hired');

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'job_seeker',
  full_name text,
  phone text,
  province text,
  city text,
  headline text,
  resume_url text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- COMPANIES
-- ============================================================
create table companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id) on delete set null,
  name text not null,
  slug text unique not null,
  logo_url text,
  website text,
  description text,
  province text,
  city text,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_companies_owner on companies(owner_id);

-- ============================================================
-- SECTORS (matches Careers24-style taxonomy, extensible)
-- ============================================================
create table sectors (
  id serial primary key,
  name text unique not null,
  slug text unique not null
);

-- ============================================================
-- JOBS
-- ============================================================
create table jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete set null,
  -- for ingested jobs without a matched company row
  company_name_raw text,
  posted_by uuid references profiles(id) on delete set null,

  title text not null,
  slug text unique not null,
  description text not null,
  sector_id int references sectors(id),

  province text,
  city text,
  is_remote boolean not null default false,

  contract_type contract_type not null default 'permanent',
  salary_min numeric,
  salary_max numeric,
  salary_currency text not null default 'ZAR',
  salary_is_market_related boolean not null default false,

  ee_aa_only boolean not null default false,
  disabled_only boolean not null default false,

  source job_source not null default 'manual',
  external_id text, -- Adzuna's job id, for de-dup
  external_url text, -- original listing URL if sourced externally
  status job_status not null default 'published',

  posted_at timestamptz not null default now(),
  expires_at timestamptz,

  views_count int not null default 0,
  search_vector tsvector,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint external_source_has_id check (
    source = 'manual' or external_id is not null
  )
);

create unique index idx_jobs_source_external on jobs(source, external_id) where external_id is not null;
create index idx_jobs_sector on jobs(sector_id);
create index idx_jobs_province on jobs(province);
create index idx_jobs_status on jobs(status);
create index idx_jobs_posted_at on jobs(posted_at desc);
create index idx_jobs_search on jobs using gin(search_vector);
create index idx_jobs_company on jobs(company_id);

-- keep search_vector in sync
create function jobs_search_vector_update() returns trigger as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.company_name_raw, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.description, '')), 'C');
  return new;
end;
$$ language plpgsql;

create trigger trg_jobs_search_vector
  before insert or update on jobs
  for each row execute function jobs_search_vector_update();

-- ============================================================
-- SAVED JOBS
-- ============================================================
create table saved_jobs (
  user_id uuid references profiles(id) on delete cascade,
  job_id uuid references jobs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, job_id)
);

-- ============================================================
-- APPLICATIONS
-- ============================================================
create table applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id) on delete cascade not null,
  applicant_id uuid references profiles(id) on delete cascade not null,
  cover_note text,
  resume_url text,
  status application_status not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, applicant_id)
);

create index idx_applications_job on applications(job_id);
create index idx_applications_applicant on applications(applicant_id);

-- ============================================================
-- JOB ALERTS
-- ============================================================
create table job_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  email text not null,
  keywords text,
  province text,
  sector_id int references sectors(id),
  frequency text not null default 'daily',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_sent_at timestamptz
);

-- ============================================================
-- NEWS (curated / RSS-ingested, attributed, short-form only)
-- ============================================================
create table news_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  summary text not null, -- short, original summary — never full-text reproduction
  source_name text not null,
  source_url text not null,
  image_url text,
  published_at timestamptz not null,
  category text,
  created_at timestamptz not null default now()
);

create index idx_news_published on news_articles(published_at desc);

-- ============================================================
-- UPDATED_AT TRIGGER (generic)
-- ============================================================
create function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated_at before update on profiles
  for each row execute function set_updated_at();
create trigger trg_jobs_updated_at before update on jobs
  for each row execute function set_updated_at();
create trigger trg_applications_updated_at before update on applications
  for each row execute function set_updated_at();

-- ============================================================
-- NEW USER -> PROFILE TRIGGER
-- ============================================================
create function handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'job_seeker')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
