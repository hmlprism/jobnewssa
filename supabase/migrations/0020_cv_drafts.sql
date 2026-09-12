-- 0020_cv_drafts.sql
-- Persistent CV draft storage for the CV Maker tool.
-- One draft per user (UNIQUE on user_id). Data is stored as JSONB so the
-- schema can evolve between Phase 1–3 without additional migrations.
--
-- The JSONB structure (Phase 1):
-- {
--   contact: { name, email, phone, city, province, linkedin },
--   summary: string,
--   work_experience: [{ employer, title, start, end|null, current, bullets[] }],
--   education:       [{ institution, qualification, year, nqf_level }],
--   skills:          { technical: string[], soft: string[] },
--   references_on_request: boolean,
--   template: "broadsheet",
--   include_photo: boolean
-- }
-- NOTE: SA ID number is intentionally absent — it is display-only in the PDF
-- and is never written to the database (POPI Act risk).

create table cv_drafts (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references profiles(id) on delete cascade,
  data        jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint cv_drafts_user_unique unique (user_id)
);

create index idx_cv_drafts_user on cv_drafts(user_id);

-- Reuse the generic set_updated_at() trigger defined in 0001_init.sql
create trigger trg_cv_drafts_updated_at
  before update on cv_drafts
  for each row execute function set_updated_at();

-- RLS
alter table cv_drafts enable row level security;

create policy "Users can read their own CV draft"
  on cv_drafts for select
  using (user_id = auth.uid());

create policy "Users can insert their own CV draft"
  on cv_drafts for insert
  with check (user_id = auth.uid());

create policy "Users can update their own CV draft"
  on cv_drafts for update
  using (user_id = auth.uid());

create policy "Users can delete their own CV draft"
  on cv_drafts for delete
  using (user_id = auth.uid());
