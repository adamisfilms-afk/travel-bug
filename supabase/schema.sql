-- Travel Bug schema. Run in the Supabase SQL editor (or `supabase db push`).
-- There is no auth yet, so RLS policies below allow the anon key full access.
-- Replace them with per-user policies once authentication is added.

create table if not exists trips (
  id text primary key,
  name text not null,
  destination text not null,
  start_date date not null,
  end_date date not null,
  travellers int not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists saved_flights (
  id text primary key,
  trip_id text not null references trips(id) on delete cascade,
  legs jsonb not null,
  cabin text not null default 'economy',
  passengers int not null default 1,
  currency text not null default 'USD',
  price_saved numeric not null,
  price_current numeric not null,
  price_checked_at timestamptz,
  booking_url text not null,
  saved_at timestamptz not null default now()
);

create table if not exists saved_stays (
  id text primary key,
  trip_id text not null references trips(id) on delete cascade,
  hotel_id text not null,
  name text not null,
  area text not null default '',
  city text not null default '',
  lat double precision not null,
  lng double precision not null,
  check_in date not null,
  check_out date not null,
  currency text not null default 'USD',
  price_saved numeric not null,
  price_current numeric not null,
  booking_url text not null,
  saved_at timestamptz not null default now()
);

create table if not exists saved_activities (
  id text primary key,
  trip_id text not null references trips(id) on delete cascade,
  name text not null,
  category text not null default 'other',
  lat double precision,
  lng double precision,
  notes text not null default '',
  saved_at timestamptz not null default now()
);

create table if not exists itinerary_items (
  id text primary key,
  trip_id text not null references trips(id) on delete cascade,
  day date not null,
  position int not null default 0,
  time text,
  kind text not null check (kind in ('flight', 'stay', 'activity')),
  ref_id text not null
);

create index if not exists saved_flights_trip_idx on saved_flights(trip_id);
create index if not exists saved_stays_trip_idx on saved_stays(trip_id);
create index if not exists saved_activities_trip_idx on saved_activities(trip_id);
create index if not exists itinerary_items_trip_day_idx on itinerary_items(trip_id, day, position);

alter table trips enable row level security;
alter table saved_flights enable row level security;
alter table saved_stays enable row level security;
alter table saved_activities enable row level security;
alter table itinerary_items enable row level security;

do $$
declare t text;
begin
  foreach t in array array['trips','saved_flights','saved_stays','saved_activities','itinerary_items'] loop
    execute format('drop policy if exists "anon full access" on %I', t);
    execute format('create policy "anon full access" on %I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;
