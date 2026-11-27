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
