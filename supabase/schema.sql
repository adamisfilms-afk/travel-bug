-- where to next — database setup.
-- Run this whole file once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- It's safe to re-run: everything is "create if not exists" / "create or replace".
--
-- Every trip row belongs to the user who created it (user_id, filled in automatically from
-- the logged-in user), and row-level security only lets people see and change their own rows.

-- ---------------------------------------------------------------------------
-- Profiles (name, admin flag) — one per user, created automatically at sign-up
-- ---------------------------------------------------------------------------

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
drop policy if exists "read own profile" on profiles;
create policy "read own profile" on profiles for select to authenticated using (id = auth.uid());
drop policy if exists "update own profile" on profiles;
create policy "update own profile" on profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
-- Users may change their name, never their admin flag (set that in the Table Editor).
revoke update on profiles from authenticated, anon;
grant update (name) on profiles to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Trips and everything saved to them
-- ---------------------------------------------------------------------------

create table if not exists trips (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  destination text not null,
  locations text[],
  share_id text,
  share_key text,
  start_date date not null,
  end_date date not null,
  travellers int not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists saved_flights (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  trip_id text not null references trips (id) on delete cascade,
  legs jsonb not null,
  cabin text not null default 'economy',
  passengers int not null default 1,
  currency text not null default 'USD',
  price_saved numeric not null,
  price_current numeric not null,
  price_checked_at timestamptz,
  booking_url text,
  booking_options jsonb,
  saved_at timestamptz not null default now()
);

create table if not exists saved_stays (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  trip_id text not null references trips (id) on delete cascade,
  hotel_id text not null,
  name text not null,
  area text,
  city text,
  lat double precision,
  lng double precision,
  image_url text,
  images jsonb,
  stars numeric,
  rating numeric,
  rating_word text,
  reviews int,
  room_type text,
  provider text,
  amenities jsonb,
  guests int,
  check_in date not null,
  check_out date not null,
  currency text not null default 'USD',
  price_saved numeric not null,
  price_current numeric not null,
  price_checked_at timestamptz,
  booking_url text,
  booking_options jsonb,
  saved_at timestamptz not null default now()
);

create table if not exists saved_activities (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  trip_id text not null references trips (id) on delete cascade,
  name text not null,
  category text not null default 'other',
  lat double precision,
  lng double precision,
  place text,
  notes text,
  saved_at timestamptz not null default now()
);

create table if not exists itinerary_items (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  trip_id text not null references trips (id) on delete cascade,
  day date not null,
  position int not null default 0,
  time text,
  kind text not null check (kind in ('flight', 'stay', 'activity')),
  ref_id text not null
);

-- Columns added after the first version (no-ops on a fresh database)
alter table trips add column if not exists locations text[];
alter table trips add column if not exists share_id text;
alter table trips add column if not exists share_key text;

create index if not exists trips_user on trips (user_id);
create index if not exists saved_flights_trip on saved_flights (trip_id);
create index if not exists saved_stays_trip on saved_stays (trip_id);
create index if not exists saved_activities_trip on saved_activities (trip_id);
create index if not exists itinerary_items_trip on itinerary_items (trip_id);

-- Each user sees and edits only their own rows
do $$
declare t text;
begin
  foreach t in array array['trips','saved_flights','saved_stays','saved_activities','itinerary_items'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "anon full access" on %I', t);
    execute format('drop policy if exists "own rows" on %I', t);
    execute format('create policy "own rows" on %I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Admin edits to curated places (written by the app's server after an admin check)
-- ---------------------------------------------------------------------------

create table if not exists curated_overrides (
  place_id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table curated_overrides enable row level security;
drop policy if exists "anyone can read" on curated_overrides;
create policy "anyone can read" on curated_overrides for select to anon, authenticated using (true);
-- No insert/update policies: only the server (service role key) writes.

-- ---------------------------------------------------------------------------
-- Shared itineraries (read-only links). Written and read by the server only.
-- ---------------------------------------------------------------------------

create table if not exists shared_itineraries (
  token text primary key,
  data jsonb not null,
  key_hash text not null,
  updated_at timestamptz not null default now()
);
alter table shared_itineraries enable row level security;
drop policy if exists "anon all" on shared_itineraries;
-- No policies: only the server (service role key) can read or write.

-- ---------------------------------------------------------------------------
-- Table access for the app (newer Supabase projects don't grant this automatically).
-- Row-level security above still decides WHICH rows each user can see.
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on trips, saved_flights, saved_stays, saved_activities, itinerary_items to authenticated;
grant select on profiles to authenticated;
grant update (name) on profiles to authenticated;
grant select on curated_overrides to anon, authenticated;
grant all on trips, saved_flights, saved_stays, saved_activities, itinerary_items, profiles, curated_overrides, shared_itineraries to service_role;

-- ---------------------------------------------------------------------------
-- Storage for curated photos uploaded by admins (public to read)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('curated', 'curated', true)
on conflict (id) do update set public = true;


-- ===========================================================================
-- Shared trips (also in supabase/002_trip_sharing.sql)
-- ===========================================================================

-- where to next — shared trips (invite other people to plan a trip with you).
-- Run once in Supabase: SQL Editor → New query → paste this file → Run. Safe to re-run.
-- (It's also included at the end of schema.sql for new projects.)
--
-- How it works:
-- - A trip has one owner (trips.user_id). Members (trip_members) can see and edit everything
--   in the trip, invite others, and leave. Only the owner can delete the trip or remove people.
-- - Invites are links with a random token (trip_invites), valid for 14 days, reusable until reset.
-- - The functions below run with elevated rights but check the caller first (auth.uid()).

create table if not exists trip_members (
  trip_id text not null references trips (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'editor',
  added_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);
create index if not exists trip_members_user on trip_members (user_id);

create table if not exists trip_invites (
  token text primary key,
  trip_id text not null references trips (id) on delete cascade,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  revoked boolean not null default false
);
create index if not exists trip_invites_trip on trip_invites (trip_id);

-- Who can see/edit a trip: its owner and its members (security definer avoids policy recursion)
create or replace function public.is_trip_owner(tid text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from trips where id = tid and user_id = auth.uid());
$$;

create or replace function public.can_access_trip(tid text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from trips where id = tid and user_id = auth.uid())
      or exists (select 1 from trip_members where trip_id = tid and user_id = auth.uid());
$$;

-- Nobody can change who owns a trip
create or replace function public.keep_trip_owner()
returns trigger language plpgsql as $$
begin
  new.user_id := old.user_id;
  return new;
end;
$$;
drop trigger if exists keep_trip_owner on trips;
create trigger keep_trip_owner before update on trips for each row execute function public.keep_trip_owner();

-- Row-level security: trips
drop policy if exists "own rows" on trips;
drop policy if exists "trip read" on trips;
drop policy if exists "trip insert" on trips;
drop policy if exists "trip update" on trips;
drop policy if exists "trip delete" on trips;
create policy "trip read" on trips for select to authenticated using (public.can_access_trip(id));
create policy "trip insert" on trips for insert to authenticated with check (user_id = auth.uid());
create policy "trip update" on trips for update to authenticated using (public.can_access_trip(id)) with check (public.can_access_trip(id));
create policy "trip delete" on trips for delete to authenticated using (user_id = auth.uid());

-- Row-level security: everything saved to a trip follows the trip
do $$
declare t text;
begin
  foreach t in array array['saved_flights','saved_stays','saved_activities','itinerary_items'] loop
    execute format('drop policy if exists "own rows" on %I', t);
    execute format('drop policy if exists "trip rows" on %I', t);
    execute format('create policy "trip rows" on %I for all to authenticated using (public.can_access_trip(trip_id)) with check (public.can_access_trip(trip_id))', t);
  end loop;
end $$;

alter table trip_members enable row level security;
drop policy if exists "members read" on trip_members;
create policy "members read" on trip_members for select to authenticated using (public.can_access_trip(trip_id));

alter table trip_invites enable row level security;
drop policy if exists "invites read" on trip_invites;
create policy "invites read" on trip_invites for select to authenticated using (public.can_access_trip(trip_id));

grant select on trip_members, trip_invites to authenticated;
grant all on trip_members, trip_invites to service_role;

-- An invite link for a trip (reuses a live one). Owner or member only.
create or replace function public.create_trip_invite(tid text)
returns text language plpgsql security definer set search_path = public as $$
declare tok text;
begin
  if not public.can_access_trip(tid) then raise exception 'Not allowed'; end if;
  select token into tok from trip_invites
    where trip_id = tid and not revoked and expires_at > now() + interval '1 day'
    order by created_at desc limit 1;
  if tok is null then
    tok := replace(gen_random_uuid()::text, '-', '');
    insert into trip_invites (token, trip_id, created_by) values (tok, tid, auth.uid());
  end if;
  return tok;
end;
$$;

-- Make old invite links stop working (a new one is created next time). Owner or member only.
create or replace function public.reset_trip_invites(tid text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.can_access_trip(tid) then raise exception 'Not allowed'; end if;
  update trip_invites set revoked = true where trip_id = tid;
end;
$$;

-- What an invite is for, shown before joining.
create or replace function public.invite_preview(tok text)
returns table (trip_id text, trip_name text, start_date date, end_date date, invited_by text, valid boolean, already_in boolean)
language sql stable security definer set search_path = public as $$
  select t.id, t.name, t.start_date, t.end_date,
         coalesce(p.name, 'Someone'),
         (not i.revoked and i.expires_at > now()),
         public.can_access_trip(t.id)
  from trip_invites i
  join trips t on t.id = i.trip_id
  left join profiles p on p.id = i.created_by
  where i.token = tok;
$$;

-- Join a trip with an invite link. Returns the trip id.
create or replace function public.accept_trip_invite(tok text)
returns text language plpgsql security definer set search_path = public as $$
declare inv trip_invites;
begin
  if auth.uid() is null then raise exception 'Log in first'; end if;
  select * into inv from trip_invites where token = tok;
  if not found or inv.revoked or inv.expires_at < now() then raise exception 'This invite link has expired'; end if;
  if not public.is_trip_owner(inv.trip_id) then
    insert into trip_members (trip_id, user_id) values (inv.trip_id, auth.uid()) on conflict do nothing;
  end if;
  return inv.trip_id;
end;
$$;

-- Everyone on a trip (owner first), for the share dialog.
create or replace function public.trip_people(tid text)
returns table (user_id uuid, name text, email text, is_owner boolean, is_you boolean)
language sql stable security definer set search_path = public as $$
  select u.id, p.name, u.email::text, true, u.id = auth.uid()
  from trips t join auth.users u on u.id = t.user_id left join profiles p on p.id = u.id
  where t.id = tid and public.can_access_trip(tid)
  union all
  select u.id, p.name, u.email::text, false, u.id = auth.uid()
  from trip_members m join auth.users u on u.id = m.user_id left join profiles p on p.id = u.id
  where m.trip_id = tid and public.can_access_trip(tid);
$$;

-- Remove someone from a trip: the owner can remove anyone; members can remove themselves (leave).
create or replace function public.remove_trip_member(tid text, uid uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_trip_owner(tid) or uid = auth.uid()) then raise exception 'Not allowed'; end if;
  delete from trip_members where trip_id = tid and user_id = uid;
end;
$$;

revoke execute on function public.create_trip_invite(text), public.reset_trip_invites(text), public.invite_preview(text),
  public.accept_trip_invite(text), public.trip_people(text), public.remove_trip_member(text, uuid) from public, anon;
grant execute on function public.create_trip_invite(text), public.reset_trip_invites(text), public.invite_preview(text),
  public.accept_trip_invite(text), public.trip_people(text), public.remove_trip_member(text, uuid),
  public.can_access_trip(text), public.is_trip_owner(text) to authenticated;
