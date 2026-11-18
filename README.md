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
| `SEARCHAPI_API_KEY` | Live Google Flights results via SearchApi.io (search, return flights, price re-checks) | Realistic generated flight data |
| `SEARCHAPI_COUNTRY` | Google country for searches (default `uk`). Currency is chosen in the app's Settings page | |
| `SEARCHAPI_DEBUG=1` | Logs the shape of SearchApi responses in the server terminal | |
| `SKYSCANNER_API_KEY` | Skyscanner partner API instead (needs partner approval) | |
| `FLIGHT_PROVIDER` | Force `searchapi`, `skyscanner` or `mock` | Uses whichever key is set |
| `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Trips are stored in Supabase | Trips are stored in the browser (`localStorage`) |

### Search credits (SearchApi)

Each SearchApi request uses one credit. To make them last:

- One-way search: 1 credit. Round trip: 1 credit for the outbound list, plus 1 each
  time you open **Choose return** on a flight (returns are remembered after that).
- Identical requests within 30 minutes are served from memory (free).
- Saved flights are re-priced at most every 12 hours when you open the planner
  (1 credit one-way, 2 round trip). Demo trips are never re-priced.
- **Book** opens the search on Google Flights (no credit used).

### Supabase setup

1. Create a project at supabase.com.
2. Run `supabase/schema.sql` in the SQL editor.
3. Put the project URL and anon key in `.env.local` and restart.

There's no authentication yet, so the schema's row-level-security policies let
the anon key read and write everything. Tighten them when auth is added.

## Structure

```
src/app/                 Pages (home, flights, stays, explore, trips, trips/[id]) and API routes
src/app/api/flights      Flight search + return flights (SearchApi / Skyscanner / mock)
src/app/api/prices       Re-prices saved flights/stays for the price-change colours
src/app/api/stays        Hotel search (mock dataset for now)
src/components/          Sidebar, map, itinerary, shared UI
src/lib/store.ts         Client state (zustand) + persistence
src/lib/backend.ts       localStorage / Supabase adapters
src/lib/flights-server.ts Provider selection, Skyscanner client, mock generator (server only)
src/lib/searchapi.ts     Google Flights via SearchApi.io (server only)
supabase/schema.sql      Database schema
```
