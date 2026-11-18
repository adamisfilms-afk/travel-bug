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
| `SEARCHAPI_API_KEY` | Live flights from **Skyscanner via SearchApi.io**: complete itineraries with each seller's price and direct booking link (falls back to Google Flights via SearchApi if that fails) | Realistic generated flight data |
| `SEARCHAPI_API_KEY` (hotels) | Live hotels from **Skyscanner via SearchApi.io**: photos, stars, guest rating, location, nightly/total price and every partner's rate and booking link | Sample hotels for New York, Budapest, London and Paris |
| `HOTEL_PROVIDER=mock` | Keep using the sample hotels even with a SearchApi key | |
| `FLIGHT_PROVIDER` | Force `skyscanner_searchapi`, `google_flights`, `skyscanner` (official partner API) or `mock` | Best provider for the keys present |
| `AFFILIATE_LINK_TEMPLATE` | Wraps Skyscanner booking links in your affiliate tracking link; `{url}` marks where the Skyscanner URL goes | Links go to Skyscanner untracked |
| `SEARCHAPI_COUNTRY` | Google country for Google Flights searches (default `uk`). Currency is chosen in the app's Settings page | |
| `SEARCHAPI_DEBUG=1` | Logs the shape of SearchApi responses in the server terminal | |
| `SKYSCANNER_API_KEY` | Skyscanner's official partner API (needs partner approval) | |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Maps use Mapbox tiles (commercial use allowed on the free tier) | CARTO's free tiles (fine for development) |
| `NEXT_PUBLIC_MAPBOX_TOKEN` (places) | Event location search uses Mapbox geocoding | OpenStreetMap Nominatim (free, low volume — fine for development) |
| `NEXT_PUBLIC_MAPBOX_STYLE` | A Mapbox Studio style, `username/style-id` (default `mapbox/light-v11`) | |
| `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Trips are stored in Supabase | Trips are stored in the browser (`localStorage`) |

### Search credits (SearchApi)

Every search is live (no caching), so prices match the provider. Each request uses one credit:

- **Skyscanner (default):** 1 credit per search, one-way or round trip.
- **"All airports" choices** (e.g. London: LHR, LGW, STN, LTN, LCY, SEN) search each airport
  separately, in parallel, showing results as each arrives: 1 credit per airport route
  (London → Budapest = 6; London → New York City all airports = 18). The count is shown under Search.
- **Google Flights:** 1 credit per search, plus 1 each time you open **Choose return** on a round-trip result.
- **Saved flights** are re-priced live when you open the trip planner (1 credit each with Skyscanner),
  skipping any checked in the last 5 minutes; **Refresh prices** forces a new check. Demo trips are never re-priced.
- **Book** opens the seller's booking page directly (Skyscanner) — no credit used.
- **Saved stays** found through live search are re-priced like flights (1 credit each when the
  planner opens, skipping any checked in the last 5 minutes; **Refresh prices** forces it).
- **Hotel search:** 1 credit per search (one page of about 35 hotels); **Show more stays** loads
  the next page for 1 more credit. The Stays page only searches when you press Search
  (or arrive from a trip's "Find stays"), never on an empty box.

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
src/app/api/stays        Hotel search (Skyscanner via SearchApi, or sample hotels)
src/components/          Sidebar, map, itinerary, shared UI
src/lib/store.ts         Client state (zustand) + persistence
src/lib/backend.ts       localStorage / Supabase adapters
src/lib/flights-server.ts Provider selection, Skyscanner client, mock generator (server only)
src/lib/searchapi.ts     Google Flights via SearchApi.io (server only)
src/lib/searchapi-hotels.ts Skyscanner hotels via SearchApi.io (server only)
supabase/schema.sql      Database schema
```
