-- Minimum qualification requirements on job postings
alter table jobs
  add column required_nqf_level          text,
  add column required_qualification_type text;
