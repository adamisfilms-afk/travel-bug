import "server-only";
import { findAirport } from "./airports";
import type { Cabin, FlightLeg, FlightOffer, Place } from "./types";

/**
 * Google Flights results via SearchApi.io (engine=google_flights).
 *
 * Google Flights returns round trips in two steps: the first search lists outbound
 * flights priced as a round trip, each with a `departure_token`; a second search with
 * that token lists the matching return flights. Each request costs one search credit,
 * so returns are only fetched when the user asks for them. Requests are always live
 * (no caching) so prices match the provider exactly.
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

/** One live SearchApi request (one search credit). */
export async function searchApiCall(engine: string, params: Record<string, string | number | undefined>): Promise<Json> {
  const qs = new URLSearchParams({ engine });
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") qs.set(k, String(v));

  const res = await fetch(`${ENDPOINT}?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${process.env.SEARCHAPI_API_KEY}` },
    cache: "no-store",
  });
  const text = await res.text();
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
