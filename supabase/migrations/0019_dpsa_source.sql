-- 0019_dpsa_source.sql
-- Adds 'dpsa' as a job source for DPSA Public Service Vacancy Circular listings.
-- Adds source_metadata for source-specific fields not in the canonical schema
-- (enquiries contact, application address, circular provenance for DPSA;
--  extensible to future sources without further migration).

-- 1. Extend the enum — ADD VALUE IF NOT EXISTS is idempotent, safe to re-run
alter type job_source add value if not exists 'dpsa';

-- 2. Nullable jsonb column — existing rows unaffected
alter table jobs
  add column if not exists source_metadata jsonb;
