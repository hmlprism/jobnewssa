-- Employer verification tracking columns.
--
-- Note: companies.verified (boolean, default false) already exists from
-- 0001_init.sql and is the canonical verification flag. We add two
-- supplementary columns here to record HOW and WHEN verification occurred.

alter table companies
  add column verification_method text,
  add column verified_at         timestamptz;
