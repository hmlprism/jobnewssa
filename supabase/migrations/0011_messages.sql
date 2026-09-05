-- Application-scoped direct messaging between employer and candidate.
-- Every message belongs to exactly one application (and therefore exactly one job).

create table messages (
  id             uuid        primary key default gen_random_uuid(),
  application_id uuid        not null references applications(id) on delete cascade,
  sender_id      uuid        not null references profiles(id) on delete cascade,
  body           text        not null,
  created_at     timestamptz not null default now(),
  read_at        timestamptz             -- null until the recipient opens the thread
);

create index idx_messages_application on messages(application_id, created_at);
create index idx_messages_sender     on messages(sender_id);

alter table messages enable row level security;

-- ── SELECT ────────────────────────────────────────────────────────────────────
-- Only the two legitimate parties to an application may read its messages:
--   1. The candidate   : applications.applicant_id = auth.uid()
--   2. The job poster  : jobs.posted_by = auth.uid()
--      (reached by joining applications → jobs via job_id)
--
-- Joining through applications → jobs is required because `messages` only stores
-- application_id. Without this join we have no way to identify the employer side.
-- The OR condition mirrors the existing applications SELECT policy exactly, which
-- prevents any third party (other employer, other candidate) from seeing threads
-- they are not part of — even if they somehow know the application_id UUID.

create policy "Parties can read thread messages"
  on messages for select
  using (
    exists (
      select 1
      from   applications a
      join   jobs          j on j.id = a.job_id
      where  a.id = messages.application_id
        and  (a.applicant_id = auth.uid() or j.posted_by = auth.uid())
    )
  );

-- ── INSERT ────────────────────────────────────────────────────────────────────
-- Two conditions must both hold:
--   1. sender_id = auth.uid()  → prevents impersonation (you cannot send as someone else)
--   2. party check             → prevents third parties from injecting messages into threads
--                                they do not own
--
-- Together these ensure only the applicant or the job poster can write to a thread,
-- and the sender field must match the authenticated user.

create policy "Parties can send messages on their threads"
  on messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1
      from   applications a
      join   jobs          j on j.id = a.job_id
      where  a.id = messages.application_id
        and  (a.applicant_id = auth.uid() or j.posted_by = auth.uid())
    )
  );

-- ── UPDATE ────────────────────────────────────────────────────────────────────
-- Used exclusively for marking received messages as read (setting read_at).
-- USING (checked against current row before update):
--   • sender_id != auth.uid()  → you can only update messages you received, not sent
--   • party check              → you must be a party to the application
-- WITH CHECK (true): column-value restriction is handled by application code; we trust
-- the server-side query to only update read_at. The USING clause is the security gate.

create policy "Recipients can mark messages as read"
  on messages for update
  using (
    sender_id != auth.uid()
    and exists (
      select 1
      from   applications a
      join   jobs          j on j.id = a.job_id
      where  a.id = messages.application_id
        and  (a.applicant_id = auth.uid() or j.posted_by = auth.uid())
    )
  )
  with check (true);
