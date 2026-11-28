-- Trip assistant: the chat saved with each trip, and a log of every AI call (for the admin page).
-- Run once in Supabase → SQL Editor (after schema.sql and 002_trip_sharing.sql).

-- Chat messages, one row per message. Everyone on the trip sees its chat.
create table if not exists public.trip_messages (
  id bigint generated always as identity primary key,
  trip_id text not null references public.trips (id) on delete cascade,
  user_id uuid default auth.uid() references auth.users (id) on delete set null,
  role text not null check (role in ('user', 'assistant')),
  content jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists trip_messages_trip on public.trip_messages (trip_id, created_at);
create index if not exists trip_messages_user on public.trip_messages (user_id, created_at);

alter table public.trip_messages enable row level security;
drop policy if exists "trip messages read" on public.trip_messages;
create policy "trip messages read" on public.trip_messages for select to authenticated using (public.can_access_trip(trip_id));
drop policy if exists "trip messages write" on public.trip_messages;
create policy "trip messages write" on public.trip_messages for insert to authenticated
  with check (public.can_access_trip(trip_id) and user_id = auth.uid());
drop policy if exists "trip messages clear" on public.trip_messages;
create policy "trip messages clear" on public.trip_messages for delete to authenticated using (public.can_access_trip(trip_id));
grant select, insert, delete on public.trip_messages to authenticated;
grant all on public.trip_messages to service_role;

-- One row per call to the AI (written by the server with the secret key; read on the admin page).
-- No policies: only the server's service role can read or write it.
create table if not exists public.assistant_calls (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid,
  trip_id text,
  request_id text,
  step text,               -- "understand" (reads the question) or "pick" (writes the cards)
  model text,
  input_tokens integer default 0,
  output_tokens integer default 0,
  cache_read_tokens integer default 0,
  cache_write_tokens integer default 0,
  cost_usd numeric(12, 6) default 0,
  duration_ms integer,
  status text,             -- ok | refused | error
  error text,
  city text,
  query text,
  curated_count integer,   -- cards from the curated guides
  general_count integer    -- cards from general (Google) suggestions
);
create index if not exists assistant_calls_created on public.assistant_calls (created_at desc);
alter table public.assistant_calls enable row level security;
grant all on public.assistant_calls to service_role;
