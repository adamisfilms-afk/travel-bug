-- wheretonext — remembers who was invited to a trip by email (shown as "Invited" until they join).
-- Run once in Supabase: SQL Editor → New query → paste → Run. Safe to re-run. Needs 002_trip_sharing.sql first.

create table if not exists trip_invite_emails (
  id bigint generated always as identity primary key,
  trip_id text not null references trips (id) on delete cascade,
  email text not null,
  invited_by uuid default auth.uid() references auth.users (id) on delete set null,
  sent_at timestamptz not null default now()
);
create index if not exists trip_invite_emails_trip on trip_invite_emails (trip_id);

alter table trip_invite_emails enable row level security;
drop policy if exists "invite emails read" on trip_invite_emails;
create policy "invite emails read" on trip_invite_emails for select to authenticated using (public.can_access_trip(trip_id));
drop policy if exists "invite emails add" on trip_invite_emails;
create policy "invite emails add" on trip_invite_emails for insert to authenticated with check (public.can_access_trip(trip_id));
drop policy if exists "invite emails remove" on trip_invite_emails;
create policy "invite emails remove" on trip_invite_emails for delete to authenticated using (public.can_access_trip(trip_id));

grant select, insert, delete on trip_invite_emails to authenticated;
grant all on trip_invite_emails to service_role;
