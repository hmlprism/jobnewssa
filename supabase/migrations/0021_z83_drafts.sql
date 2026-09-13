-- Migration 0021: z83_drafts table
-- Stores partial Z83 form progress for logged-in users.
-- Anonymous users have NO persistence (session-only, no localStorage).
--
-- What is stored in data (JSONB):
--   section_a  — job-specific fields (position, department, reference, availability)
--   section_b  — DEMOGRAPHICS ONLY: name, race, gender, disability, citizenship,
--                nationality, work permit, years of experience, professional registration,
--                preferred language, communication preference, contact details
--   section_d  — language proficiency grid (up to 5 languages)
--   section_e  — qualifications (up to 4 rows) + current study
--   section_f  — work experience (up to 3 rows) + PS re-appointment Yes/No
--   section_g  — references (up to 3 rows)
--
-- What is NEVER stored (even for logged-in users):
--   id_number                    — 13-digit SA ID, display-only
--   date_of_birth (dob)          — DDMMYY, sensitive biometric PII, display-only
--   Section B declaration Yes/No — criminal conviction, pending criminal, dismissed,
--                                   pending disciplinary, resigned pending, discharged
--                                   ill-health, business with State, will relinquish
--   Declaration free-text fields — all "provide details" text fields for the above
--   ps_reappointment_details     — sensitive text about previous PS employment condition
--   Canvas signatures            — page 1 initials, page 2 initials, declaration signature
--
-- The set_updated_at() trigger function is defined in 0001_init.sql and reused here.

create table if not exists z83_drafts (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references profiles(id) on delete cascade,
  data       jsonb       not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create trigger set_updated_at_z83_drafts
  before update on z83_drafts
  for each row execute function set_updated_at();

alter table z83_drafts enable row level security;

create policy "z83_drafts_select" on z83_drafts
  for select using (auth.uid() = user_id);

create policy "z83_drafts_insert" on z83_drafts
  for insert with check (auth.uid() = user_id);

create policy "z83_drafts_update" on z83_drafts
  for update using (auth.uid() = user_id);

create policy "z83_drafts_delete" on z83_drafts
  for delete using (auth.uid() = user_id);
