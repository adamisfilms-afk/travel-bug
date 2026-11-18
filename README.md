# Travel Bug

Plan holidays in one place: search flights and stays, save them to a trip, then
drag them onto a day-by-day itinerary with a map. See
[`docs/PRODUCT_PLAN.md`](docs/PRODUCT_PLAN.md) for the product plan and style guide.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. On first launch two demo trips (New York City and
Budapest) are created so every screen has content.

## Configuration

Copy `.env.example` to `.env.local`. Everything is optional:

| Variable | Effect when set | Without it |
|---|---|---|
| `SKYSCANNER_API_KEY` | Live flight search and price refresh via Skyscanner Flights Live Prices v3 | Realistic generated flight data |
| `SKYSCANNER_MARKET` / `_LOCALE` / `_CURRENCY` | Sent with every Skyscanner query (defaults `UK` / `en-GB` / `USD`) | |
| `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Trips are stored in Supabase | Trips are stored in the browser (`localStorage`) |

### Supabase setup

1. Create a project at supabase.com.
2. Run `supabase/schema.sql` in the SQL editor.
3. Put the project URL and anon key in `.env.local` and restart.

There's no authentication yet, so the schema's row-level-security policies let
the anon key read and write everything. Tighten them when auth is added.

## Structure

```
src/app/                 Pages (home, flights, stays, explore, trips, trips/[id]) and API routes
src/app/api/flights      Flight search (Skyscanner or mock)
src/app/api/prices       Re-prices saved flights/stays for the price-change colours
src/app/api/stays        Hotel search (mock dataset for now)
src/components/          Sidebar, map, itinerary, shared UI
src/lib/store.ts         Client state (zustand) + persistence
src/lib/backend.ts       localStorage / Supabase adapters
src/lib/flights-server.ts Skyscanner client + mock generator (server only)
supabase/schema.sql      Database schema
```
