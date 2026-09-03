-- Replace the partial unique index with a full unique constraint so that
-- ON CONFLICT (source, external_id) works in upserts.
-- NULLs are treated as distinct in UNIQUE constraints, so multiple manual
-- jobs with external_id IS NULL are still allowed.

drop index if exists idx_jobs_source_external;

alter table jobs
  add constraint jobs_source_external_uniq unique (source, external_id);
