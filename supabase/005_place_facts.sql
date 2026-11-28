-- Google facts (rating, review count, price level) for curated places, used by the trip assistant
-- to say which places might be best and to show prices. Cached for 30 days so each place is only
-- looked up on Google about once a month. Server-only (secret key); no policies needed.
create table if not exists public.place_facts (
  query text primary key,      -- the place's Google search text (mapsQuery)
  rating numeric(2, 1),
  reviews integer,
  price smallint,              -- 1–4
  summary text,
  updated_at timestamptz not null default now()
);
alter table public.place_facts enable row level security;
grant all on public.place_facts to service_role;
