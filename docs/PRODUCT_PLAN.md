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
| Pin | `/explore` | Curated trip plans & things to do | Under construction |
| Checklist | `/trips` | Your trips (itinerary + map) | Built |
| — | `/trips/[id]` | Trip planner | Built |
| Gear | `/settings` | Settings | Under construction |

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
  (depart + optional return), **travellers**, **cabin class**, and optional
  **departure / arrival time windows**.
- **Search** button (green, right aligned).
- After a search, filter **chips** appear under the bar: price range, stops,
  airlines. These filter results client-side without re-querying.
- Each result row: route, flight number, times, date, price, and **Add to trip**
  (choose an existing trip or create one).
- Powered by the **Skyscanner Flights Live Prices API (v3)** through a
  server-side route (`/api/flights/search`) so the API key never reaches the
  browser. Without a key the route returns realistic mock data so the UI is
  fully usable in preview.

### 3.3 Stays (`/stays`)
- Search: city / hotel / landmark, check-in/out dates, guests.
- Chips: price range, amenities, star rating.
- Results list of hotel cards (image, stars, area, rating, tags, nightly +
  total price, provider, **Add to trip**), with a map on the right showing
  every result. Hovering a card highlights its pin.
- Data comes from `/api/stays/search` (mock dataset today; swap in a hotels
  provider later without changing the UI).

### 3.4 Explore (`/explore`)
- Under construction. Will show curated trip plans and things to do per city,
  each addable to a trip.

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
| Skyscanner Travel API | Live flight search, price refresh, booking deep links | `SKYSCANNER_API_KEY` (server only) |
| Supabase | Persistence | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| OpenStreetMap / CARTO tiles via Leaflet | Maps | none |

## 6. Style guide

The look is calm, airy and paper-like: a warm off-white canvas, soft light
cards with hairline dashed green borders for "selected/saved" things, a single
sage-green accent and heavy black headlines.

### Colour tokens

| Token | Hex | Use |
|---|---|---|
| `canvas` | `#ECEEE9` | Page background |
| `surface` | `#F4F4F2` | Cards, inputs, chips |
| `surface-strong` | `#FFFFFF` | Hotel cards, popovers |
| `line` | `#D6D8D2` | Dividers, sidebar edge |
| `ink` | `#111111` | Headlines, primary text |
| `ink-muted` | `#8C8C8C` | Secondary text (flight numbers, dates) |
| `accent` | `#7AB06B` | Search button, round arrow buttons, active chip |
| `accent-soft` | `#A9CFA0` | Dashed borders on selected/saved items |
| `accent-ink` | `#5E9A50` | "Trip Planner" link |
| `price-up` | `#A35F5F` | Price increased |
| `price-down` | `#4F8A42` | Price decreased |
| Placeholders | `#DFC174` mustard · `#A3CBD9` sky · `#C5D9AC` sage · `#DADC8C` lime | Curated card placeholders |

### Typography
- **Inter** throughout.
- Page title: 56px / 800 weight / tight tracking (“Your trips”, “Flights”).
- Section title: 34px / 400 (“Upcoming trips”, “Flights”, “Itinerary”).
- Card title: 22px / 700 (“New York City Itinerary”, day headings at 20px / 600).
- Body: 17–18px / 400; meta text 15px in `ink-muted`.
- Tiny pills (time, passengers): 13px.

### Components
- **Sidebar**: 108px wide, `canvas` background, 1px right border, black solid
  icons (≈36px). Gradient avatar circle at top. Trips + settings at the bottom.
- **Chip / tab button**: `surface` fill, 8px radius, 18px horizontal padding,
  58px tall. Selected = 1px dashed `accent-soft` border.
- **Filter chip**: fully rounded pill, `surface`; active = solid `accent`
  with white text.
- **Search bar**: `surface`, 10px radius, 58px tall, placeholder text in muted
  grey; Search button = `accent` fill, white 22px text, 10px radius.
- **List row card** (flights/stays in planner): `surface`, dashed
  `accent-soft` border, 10px radius, columns aligned, round green 40px arrow
  button on the right.
- **Itinerary**: day heading (bold date), rows with a small time pill
  (plane-departure icon + `HH:MM`), flight block with dotted-circle origin, a
  vertical dashed line with a plane, and a filled-circle destination. Days
  separated by a dotted rule.
- **Map**: square corners, light CARTO tiles, simple dark pins.
- **Curated cards**: 16px radius, ~325×195, flat placeholder colours.

### Interaction
- Hover on cards: slight lift (shadow), cursor grab on draggable items.
- Drag: dragged item at 60% opacity; drop zones (days) get a dashed green
  outline.
- Transitions 150ms ease-out. No heavy animation.
