-- Row Level Security policies

alter table profiles enable row level security;
alter table companies enable row level security;
alter table jobs enable row level security;
alter table saved_jobs enable row level security;
alter table applications enable row level security;
alter table job_alerts enable row level security;
alter table news_articles enable row level security;

-- ---------- PROFILES ----------
create policy "Profiles are viewable by everyone"
  on profiles for select using (true);

create policy "Users can update their own profile"
  on profiles for update using (auth.uid() = id);

-- ---------- COMPANIES ----------
create policy "Companies are viewable by everyone"
  on companies for select using (true);

create policy "Employers can create companies"
  on companies for insert with check (auth.uid() = owner_id);

create policy "Owners can update their company"
  on companies for update using (auth.uid() = owner_id);

-- ---------- JOBS ----------
create policy "Published jobs are viewable by everyone"
  on jobs for select using (
    status = 'published'
    or posted_by = auth.uid()
    or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Employers can insert their own jobs"
  on jobs for insert with check (
    auth.uid() = posted_by
    and exists (select 1 from profiles where id = auth.uid() and role in ('employer', 'admin'))
  );

create policy "Employers can update their own jobs"
  on jobs for update using (
    posted_by = auth.uid()
    or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Employers can delete their own jobs"
  on jobs for delete using (
    posted_by = auth.uid()
    or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- ---------- SAVED JOBS ----------
create policy "Users manage their own saved jobs"
  on saved_jobs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- APPLICATIONS ----------
create policy "Applicants view their own applications"
  on applications for select using (
    applicant_id = auth.uid()
    or exists (
      select 1 from jobs where jobs.id = applications.job_id and jobs.posted_by = auth.uid()
    )
  );

create policy "Job seekers can apply"
  on applications for insert with check (auth.uid() = applicant_id);

create policy "Employers can update application status on their jobs"
  on applications for update using (
    exists (
      select 1 from jobs where jobs.id = applications.job_id and jobs.posted_by = auth.uid()
    )
  );

-- ---------- JOB ALERTS ----------
create policy "Users manage their own alerts"
  on job_alerts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- NEWS ----------
create policy "News is viewable by everyone"
  on news_articles for select using (true);
