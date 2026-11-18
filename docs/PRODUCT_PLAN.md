# Travel Bug — Product Plan

## 1. Purpose

Travel Bug is a single place to plan a holiday from first idea to booked itinerary.
Most trip planning today is spread across a flight search site, a hotel site, a
notes app and a calendar. Travel Bug pulls those together into a **trip**: a
container for the flights, stays and things to do you are considering, and a
day-by-day **itinerary** you build by dragging those items onto days.

### Goals

- **Collect, then decide.** Save candidate flights and stays into a trip without
  committing. Compare them side by side in the planner.
- **Watch prices.** Every saved flight and stay remembers the price it was saved
  at. When the live price moves, the planner shows it in colour (red = up,
  green = down) with a tooltip explaining the change.
- **Shape the days.** Drag saved items into an itinerary, reorder them within a
  day, move them across days and give each a time.
- **See it on a map.** Every itinerary item with a location appears on the
  trip map.
- **Book when ready.** The green arrow on any saved flight or stay goes straight
  to the booking page.

### Non-goals (for now)

- Accounts and authentication. There is a single implicit user ("Adam").
- In-app payment. Booking hands off to the provider (Skyscanner deep links).
- Collaborative/shared trips.

## 2. Information architecture

A fixed left sidebar with icon navigation:

| Icon | Route | Page | Status |
|---|---|---|---|
| Avatar | `/` | Home / dashboard | Built (curated rows are coloured placeholders) |
| Plane | `/flights` | Flight search | Built |
| Bed | `/stays` | Hotel search | Built |
| Fork & knife | `/food` | Curated food guides (city search → Dinner, Brunch, Lunch, Sweet, Coffee, Drinks rows) | Built (sample New York guide) |
| Pin | `/explore` | Curated things to do (city search → Sights, Museums, Shows, Parks, Neighbourhoods, Experiences rows) | Built (sample New York guide) |
| Checklist | `/trips` | Your trips (itinerary + map) | Built |
| — | `/trips/[id]` | Trip planner | Built |
| Gear | `/settings` | Settings (currency) | Built |

## 3. How each page works

### 3.1 Home (`/`)
- Greeting: "Hey Adam, Let's plan your next adventure."
- **Upcoming trips**: a chip per trip (links to `/trips?trip=<id>`) plus an
  **Add new trip** chip that opens the new-trip dialog.
- **Curated things to do** and **Curated stays**: horizontally scrolling rows of
  coloured placeholder cards (mustard, sky, sage, lime). Real content will come
  from the Explore feature later.

### 3.2 Flights (`/flights`)
- Search bar: **From** ⇄ **Destination** (airport autocomplete), **dates**
  (depart + optional return), **travellers** and **cabin class**.
- **Search** button (green, right aligned).
- After a search, filter **chips** appear under the bar: price range, stops,
  airlines, and outbound / return times (dual-handle sliders for departure and
  arrival hours). These filter results client-side without re-querying.
- Search form, results and filters persist while moving between pages (and
  across a refresh in the same tab).
- Each result row: route, flight number, times, date, price, and **Add to trip**
  (choose an existing trip or create one).
- Powered by **Skyscanner via SearchApi.io** (Google Flights as fallback) through server-side routes
  (`/api/flights/search`, `/api/flights/returns`) so the API key never reaches
  the browser. Skyscanner's partner API is supported as an alternative. Without
  a key the routes return realistic mock data so the UI is fully usable.
- **Book** goes straight to the seller's booking page (airline or travel agent); with
  several sellers it opens a menu of them with their prices. Skyscanner links can carry
  affiliate tracking.
- With Google Flights results, round trips are two-step: results list outbound flights
  with a "round trip from" price; **Choose return** loads that flight's return
  options (one search credit), each with its own price, **Book** and **+**.

### 3.3 Stays (`/stays`)
- Search: city / hotel / landmark, check-in/out dates, guests.
- Chips: price range, amenities, star rating.
- Results list of hotel cards (image, stars, area, rating, tags, nightly +
  total price, provider, **Add to trip**), with a map on the right showing
  every result. Hovering a card highlights its pin.
- Data comes from `/api/stays/search`: Skyscanner hotels via SearchApi.io (photos,
  stars, rating, coordinates, nightly + total price, every partner's rate and link),
  or sample hotels without a key. "Go to site" opens the cheapest partner; the
  "+N booking options" menu lists every partner's nightly price and room.

### 3.4 Food (`/food`) and Explore (`/explore`)
- Same layout: city search (suggests only cities with a curated guide; others
  show "coming soon"), then horizontally scrolling rows per section.
- Cards: the place's Google Maps photo (curator-picked, or automatically the
  business's own uploads first), name, two-word tagline, neighbourhood, a small
  Google photo credit, and a hover "+" to add it to a trip as an event (with its
  category and location).
- Curators add `?curate=1` to flip through each place's Google photos and pick
  one; "Copy picks" exports the choices to save into the guide data.

### 3.5 Your trips (`/trips`)
- Trip chips at the top (+ Add new trip).
- Selecting a trip loads its **itinerary** (read-only, grouped by day) on the
  left and a **map** with every located itinerary item on the right.
- **Trip Planner** link opens the planner.

### 3.6 Trip planner (`/trips/[id]`)
- Header: trip name + date range.
- **Flights**: every saved flight with legs, flight numbers, times, dates, and
  price. **Stays**: saved hotels with nights, dates, price. **Things to do**:
  saved activities, plus a quick "add activity" form and suggestions.
- **Price colours**: black = unchanged, red = increased, green = decreased.
  Hover shows "Price has increased from $250 to $270 since you saved it."
  Prices refresh when the planner opens (`/api/prices/refresh`).
- **Green arrow button** opens the booking link in a new tab.
- **Itinerary** column: one section per day of the trip. Drag any saved flight,
  stay or activity onto a day; drag within/between days to reorder; click the
  time chip to set a time. Items can be removed from the itinerary (they stay
  saved in the trip).

## 4. Data model

```
trips            id, name, destination, start_date, end_date, travellers, created_at
saved_flights    id, trip_id, legs (jsonb), cabin, passengers, currency,
                 price_saved, price_current, price_checked_at, booking_url, saved_at
saved_stays      id, trip_id, hotel_id, name, area, city, lat, lng, image_url,
                 check_in, check_out, currency, price_saved, price_current,
                 booking_url, saved_at
saved_activities id, trip_id, name, category, lat, lng, notes, saved_at
itinerary_items  id, trip_id, day (date), position, time, kind
                 ('flight' | 'stay' | 'activity'), ref_id
```

Itinerary items *reference* saved items, so deleting a saved item removes it
from the itinerary, and the same stay can appear on several days (check-in,
check-out).

### Persistence

- **Default:** browser `localStorage` (zero setup; perfect for preview).
- **Supabase:** set `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` and run `supabase/schema.sql`. The app then
  reads and writes the tables above. Because there is no auth yet, the schema
  ships with permissive RLS policies; tighten them when auth lands.

## 5. Integrations

| Service | Used for | Config |
|---|---|---|
| SearchApi.io → Skyscanner | Live flight search with per-seller direct booking links, price refresh | `SEARCHAPI_API_KEY` (server only) |
| SearchApi.io → Google Flights | Fallback / alternative provider | `SEARCHAPI_API_KEY`, `FLIGHT_PROVIDER=google_flights` |
| Skyscanner affiliate programme (Impact) | Commission on booking redirects | `AFFILIATE_LINK_TEMPLATE` |
| Skyscanner Travel API (optional) | Alternative provider if accepted as a partner | `SKYSCANNER_API_KEY` (server only) |
| Supabase | Persistence | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| OpenStreetMap / CARTO tiles via Leaflet | Maps | none |

## 6. Style guide

The look is calm, airy and paper-like: a warm off-white canvas, soft light
cards with hairline dashed green borders for "selected/saved" things, a single
deep forest-green accent (#274321) and heavy black headlines.

### Colour tokens

| Token | Hex | Use |
|---|---|---|
| `canvas` | `#ECEEE9` | Page background |
| `surface` | `#F4F4F2` | Cards, inputs, chips |
| `surface-strong` | `#FFFFFF` | Hotel cards, popovers |
| `line` | `#D6D8D2` | Dividers, sidebar edge |
| `ink` | `#111111` | Headlines, primary text |
| `ink-muted` | `#8C8C8C` | Secondary text (flight numbers, dates) |
| `accent` | `#274321` | Search button, round arrow buttons, active chip |
| `accent-soft` | `#93AD8C` | Dashed borders on selected/saved items |
| `accent-ink` | `#274321` | "Trip Planner" link |
| `price-up` | `#A35F5F` | Price increased |
| `price-down` | `#4F8A42` | Price decreased |
| Placeholders | `#DFC174` mustard · `#A3CBD9` sky · `#C5D9AC` sage · `#DADC8C` lime | Curated card placeholders |

### Typography
- **Inter** throughout.
- Page title: 42px / 800 weight / tight tracking (“Your trips”, “Flights”). Planner trip title: 30px.
- Section title: 26px / 400 (“Flights”, “Itinerary”).
- Card title: 20px / 700 (“New York City Itinerary”); day headings 16px / 600.
- Body: 15px / 400; list rows 14px; meta text 13px in `ink-muted`.
- Tiny pills (time, passengers): 12px.

### Components
- **Sidebar**: 84px wide, `canvas` background, 1px right border, black solid
  icons (28px). Gradient avatar circle at top. Trips + settings at the bottom.
  Hover = grey outline, active = `accent-soft` outline, both following the
  icon's shape with a 2px gap (no background fill).
- **Chip / tab button**: `surface` fill, 8px radius, 16px horizontal padding,
  44px tall. Selected = 1px dashed `accent-soft` border.
- **Filter chip**: fully rounded pill, `surface`; active = solid `accent`
  with white text.
- **Search bar**: `surface`, 10px radius, 44px tall, placeholder text in muted
  grey; Search button = `accent` fill, white 17px text, 10px radius.
- **List row card** (flights/stays in planner): `surface`, dashed
  `accent-soft` border, 10px radius, ~10px vertical padding, columns aligned
  on a 24px line (flights show airport codes only), price and a round green
  32px arrow button on the right. A green dot (top-left) marks items already
  in the itinerary; the delete button sits on the top-right corner on hover.
  Price tooltips open to the left of the price.
- **Itinerary**: day heading (bold date), rows on a fixed grid
  `[time pill][icon][name]` so untimed items line up with timed ones; a stay's
  second line (check-in / nights) sits under its name. Flight block with dotted-circle origin, a
  vertical dashed line with a plane, and a filled-circle destination. Days
  separated by a dotted rule.
- **Map**: square corners, light CARTO tiles, simple dark pins.
- **Curated cards**: 16px radius, ~270×162, flat placeholder colours.
- **Planner side panel**: "Itinerary | Map" tabs; the map replaces the
  itinerary in place.

### Interaction
- Hover on cards: slight lift (shadow), cursor grab on draggable items.
- Drag: dragged item at 60% opacity; drop zones (days) get a dashed green
  outline.
- Transitions 150ms ease-out. No heavy animation.
