import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { findAirport } from "./airports";
import type { Cabin, FlightLeg, FlightOffer, Place } from "./types";

/**
 * Google Flights results via SearchApi.io (engine=google_flights).
 *
 * Google Flights returns round trips in two steps: the first search lists outbound
 * flights priced as a round trip, each with a `departure_token`; a second search with
 * that token lists the matching return flights. Each request costs one search credit,
 * so returns are only fetched when the user asks for them.
 */

const ENDPOINT = "https://www.searchapi.io/api/v1/search";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Json = any;

export interface SearchApiParams {
  from: string;
  to: string;
  depart: string;
  returnDate?: string;
  adults: number;
  cabin: Cabin;
  currency: string;
}

const CABIN: Record<Cabin, string> = {
  economy: "economy",
  premium_economy: "premium_economy",
  business: "business",
  first: "first_class",
};

export function searchApiEnabled() {
  return Boolean(process.env.SEARCHAPI_API_KEY);
}

// ---------------------------------------------------------------------------
// Credit saving: identical requests share one response
// ---------------------------------------------------------------------------

/** How old a cached response may be for searches (re-running the same search, page reloads). */
const SEARCH_MAX_AGE = 10 * 60_000;
/** How old a cached response may be for background price checks in the planner. */
export const PRICE_CHECK_MAX_AGE = Math.max(0, Number(process.env.PRICE_CHECK_TTL_MINUTES ?? 360)) * 60_000;

type CacheEntry = { at: number; data: Promise<Json> };
// On globalThis so dev hot reloads don't empty it.
const g = globalThis as unknown as { __searchApiCache?: Map<string, CacheEntry>; __searchApiCredits?: number };
const cache = (g.__searchApiCache ??= new Map());
const maxAgeCtx = new AsyncLocalStorage<number>();

/** Run `fn` with SearchApi responses up to `ms` old reused instead of spending a new credit. */
export function withMaxAge<T>(ms: number, fn: () => Promise<T>): Promise<T> {
  return maxAgeCtx.run(ms, fn);
}

/**
 * One SearchApi request — one search credit, unless the same request was made recently
 * (see SEARCH_MAX_AGE / withMaxAge), in which case that response is reused. Identical
 * requests made at the same moment also share one call.
 */
export async function searchApiCall(engine: string, params: Record<string, string | number | undefined>): Promise<Json> {
  const qs = new URLSearchParams({ engine });
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") qs.set(k, String(v));
  const key = qs.toString();
  const maxAge = maxAgeCtx.getStore() ?? SEARCH_MAX_AGE;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < maxAge) return hit.data;

  const data = liveCall(engine, qs);
  cache.set(key, { at: Date.now(), data });
  data.catch(() => cache.delete(key)); // don't keep failures
  // Drop entries nothing will reuse
  if (cache.size > 500) for (const [k, e] of cache) if (Date.now() - e.at > Math.max(PRICE_CHECK_MAX_AGE, SEARCH_MAX_AGE)) cache.delete(k);
  return data;
}

async function liveCall(engine: string, qs: URLSearchParams): Promise<Json> {
  g.__searchApiCredits = (g.__searchApiCredits ?? 0) + 1;
  const n = g.__searchApiCredits;
  const started = Date.now();
  const res = await fetch(`${ENDPOINT}?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${process.env.SEARCHAPI_API_KEY}` },
    cache: "no-store",
  });
  const text = await res.text();
  // How long SearchApi took (most of any search's wait) and the running credit count
  console.log(`[searchapi] ${engine} — ${((Date.now() - started) / 1000).toFixed(1)}s (${n} credit${n === 1 ? "" : "s"} used since the server started)`);
  let data: Json;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`SearchApi ${res.status}: ${text.slice(0, 200)}`);
  }
  if (!res.ok || data?.error) {
    throw new Error(`SearchApi ${res.status}: ${data?.error ?? text.slice(0, 200)}`);
  }
  if (process.env.SEARCHAPI_DEBUG) {
    console.log(`[searchapi:${engine}] top-level keys:`, Object.keys(data));
    const first = (data.itineraries ?? data.best_flights ?? data.other_flights ?? [])[0];
    if (first) console.log(`[searchapi:${engine}] first result:`, JSON.stringify(first).slice(0, 3000));
  }
  return data;
}

const call = (params: Record<string, string | number | undefined>) => searchApiCall("google_flights", params);

function baseParams(p: SearchApiParams) {
  return {
    departure_id: p.from,
    arrival_id: p.to,
    outbound_date: p.depart,
    return_date: p.returnDate,
    flight_type: p.returnDate ? "round_trip" : "one_way",
    adults: p.adults,
    travel_class: CABIN[p.cabin],
    currency: p.currency || process.env.SEARCHAPI_CURRENCY || "USD",
    hl: "en",
    gl: process.env.SEARCHAPI_COUNTRY || "uk",
  };
}

// ---------------------------------------------------------------------------
// Parsing (defensive: accepts "YYYY-MM-DD HH:MM" or separate date + time fields)
// ---------------------------------------------------------------------------

export function to24h(t: string): string {
  const m = t.trim().match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])?$/);
  if (!m) return t.slice(0, 5);
  let h = Number(m[1]);
  const ap = m[3]?.toLowerCase();
  if (ap === "pm" && h < 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

export function isoOf(a: Json, fallbackDay: string): string {
  // Full timestamps in any of the usual fields: "2026-12-23 07:30", "2026-12-23T07:30:00"
  for (const v of [a?.time, a?.datetime, a?.date_time, a?.local_time]) {
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}[ T]\d{1,2}:\d{2}/.test(v)) {
      const [d, t] = v.split(/[ T]/);
      return `${d}T${to24h(t.slice(0, 5).replace(/:$/, ""))}`;
    }
  }
  const day = typeof a?.date === "string" && /^\d{4}-\d{2}-\d{2}/.test(a.date) ? a.date.slice(0, 10) : fallbackDay;
  return `${day}T${typeof a?.time === "string" ? to24h(a.time) : "00:00"}`;
}

export function placeOf(a: Json): Place {
  const code = String(a?.id ?? a?.code ?? "").toUpperCase();
  return findAirport(code) ?? { code: code || "???", name: a?.name ?? code, city: a?.city ?? a?.name ?? code, lat: 0, lng: 0 };
}

/** One result group (outbound journey, possibly with connections) → one FlightLeg. */
function legOf(group: Json, fallbackDay: string): FlightLeg | null {
  const segs: Json[] = group?.flights ?? [];
  if (!segs.length) return null;
  const first = segs[0];
  const last = segs[segs.length - 1];
  const flightNumber = String(first.flight_number ?? "").trim();
  const code = flightNumber.split(/\s+/)[0] || undefined;
  const segMins = segs.reduce((n, s) => n + (Number(s.duration) || 0), 0);
  const layoverMins = (group.layovers ?? []).reduce((n: number, l: Json) => n + (Number(l.duration) || 0), 0);
  return {
    from: placeOf(first.departure_airport),
    to: placeOf(last.arrival_airport),
    carrier: first.airline ?? "Unknown airline",
    carrierCode: code,
    flightNumber: flightNumber || "—",
    depart: isoOf(first.departure_airport, fallbackDay),
    arrive: isoOf(last.arrival_airport, fallbackDay),
    stops: segs.length - 1,
    durationMins: Number(group.total_duration) || segMins + layoverMins,
    segments: segs.map((sg) => {
      const fn = String(sg.flight_number ?? "").trim();
      return {
        from: placeOf(sg.departure_airport),
        to: placeOf(sg.arrival_airport),
        depart: isoOf(sg.departure_airport, fallbackDay),
        arrive: isoOf(sg.arrival_airport, fallbackDay),
        carrier: sg.airline ?? "Unknown airline",
        carrierCode: fn.split(/\s+/)[0] || undefined,
        flightNumber: fn || "—",
        durationMins: Number(sg.duration) || 0,
      };
    }),
  };
}

export function priceOf(group: Json): number | null {
  const p = group?.price;
  if (typeof p === "number") return p;
  if (typeof p === "string") {
    const n = Number(p.replace(/[^\d.]/g, ""));
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  if (p && typeof p === "object") return priceOf({ price: p.amount ?? p.value ?? p.total ?? p.raw ?? p.extracted ?? p.formatted });
  return null;
}

/** A free link that opens this search on Google Flights (booking options live there). */
export function googleFlightsUrl(p: SearchApiParams) {
  const q = p.returnDate
    ? `Flights from ${p.from} to ${p.to} on ${p.depart} returning ${p.returnDate}`
    : `Flights from ${p.from} to ${p.to} on ${p.depart} one way`;
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(q)}`;
}

function groupsOf(data: Json): Json[] {
  return [...(data?.best_flights ?? []), ...(data?.other_flights ?? [])];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Outbound (or one-way) options. Round-trip offers carry `departureToken` and no return leg yet. */
export async function searchApiSearch(p: SearchApiParams): Promise<FlightOffer[]> {
  const data = await call(baseParams(p));
  const currency = p.currency || process.env.SEARCHAPI_CURRENCY || "USD";
  const link = data?.search_metadata?.google_flights_url ?? googleFlightsUrl(p);
  const offers: FlightOffer[] = [];
  groupsOf(data).forEach((g, i) => {
    const leg = legOf(g, p.depart);
    const price = priceOf(g);
    if (!leg || price == null) return;
    offers.push({
      id: `sa-${p.depart}-${leg.flightNumber}-${leg.depart}-${i}`,
      legs: [leg],
      price,
      currency,
      cabin: p.cabin,
      passengers: p.adults,
      bookingUrl: link,
      provider: "Google Flights",
      ...(p.returnDate ? { departureToken: g.departure_token, returnDate: p.returnDate } : {}),
    });
  });
  if (!offers.length && groupsOf(data).length) {
    throw new Error("SearchApi returned flights in an unexpected format (set SEARCHAPI_DEBUG=1 to log it).");
  }
  return offers;
}

/** Return options for a chosen outbound flight; each result is a complete two-leg offer. */
export async function searchApiReturns(p: SearchApiParams, outbound: FlightOffer): Promise<FlightOffer[]> {
  if (!outbound.departureToken || !p.returnDate) return [];
  const data = await call({ ...baseParams(p), departure_token: outbound.departureToken });
  const link = data?.search_metadata?.google_flights_url ?? googleFlightsUrl(p);
  const offers: FlightOffer[] = [];
  groupsOf(data).forEach((g, i) => {
    const back = legOf(g, p.returnDate!);
    const price = priceOf(g);
    if (!back || price == null) return;
    offers.push({
      ...outbound,
      id: `${outbound.id}-r${i}-${back.flightNumber}`,
      legs: [outbound.legs[0], back],
      price,
      bookingUrl: link,
      departureToken: undefined,
      returnDate: undefined,
    });
  });
  return offers;
}
