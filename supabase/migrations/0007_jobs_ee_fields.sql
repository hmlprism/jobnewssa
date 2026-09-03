-- EE Act wording fields on jobs
-- These are advertiser-written text fields for lawful Employment Equity
-- notices per the SA Employment Equity Act — not candidate filters.

alter table jobs
  add column employment_equity_note text,
  add column accommodation_contact  text;
