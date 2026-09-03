-- Fix: employer_direct jobs have no external_id and should not require one.
-- Only truly external feed sources (e.g. adzuna) must supply an external_id.

alter table jobs
  drop constraint external_source_has_id;

alter table jobs
  add constraint external_source_has_id check (
    source in ('manual', 'employer_direct') or external_id is not null
  );
