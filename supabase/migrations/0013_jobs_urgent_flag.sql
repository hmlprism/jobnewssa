-- Add is_urgent flag to jobs table.
-- Run this in Supabase BEFORE deploying code that reads this column.

alter table jobs add column if not exists is_urgent boolean not null default false;

comment on column jobs.is_urgent is
  'Set true by admins/employers to surface an Urgent badge on the listing card.';
