import "server-only";
import { AIRPORTS, findAirport } from "./airports";
import { fromUsd } from "./currency";
import { searchApiEnabled, searchApiReturns, searchApiSearch } from "./searchapi";
import type { Cabin, FlightLeg, FlightOffer, Place, SavedFlight } from "./types";

export interface FlightSearchParams {
  from: string; // IATA
  to: string;
  depart: string; // YYYY-MM-DD
  returnDate?: string;
  adults: number;
  cabin: Cabin;
  currency: string; // ISO 4217, e.g. "GBP"
}

const SKY_BASE = "https://partners.api.skyscanner.net/apiservices/v3";

export type FlightSource = "searchapi" | "skyscanner" | "mock";

/** Which provider to use: FLIGHT_PROVIDER if set, else whichever API key is present, else demo data. */
export function flightSource(): FlightSource {
  const forced = process.env.FLIGHT_PROVIDER as FlightSource | undefined;
  if (forced === "searchapi" && searchApiEnabled()) return "searchapi";
  if (forced === "skyscanner" && process.env.SKYSCANNER_API_KEY) return "skyscanner";
  if (forced === "mock") return "mock";
  if (searchApiEnabled()) return "searchapi";
  if (process.env.SKYSCANNER_API_KEY) return "skyscanner";
  return "mock";
}

export async function searchFlights(p: FlightSearchParams): Promise<{ offers: FlightOffer[]; source: FlightSource }> {
  const source = flightSource();
  if (source === "searchapi") return { offers: await searchApiSearch(p), source };
  if (source === "skyscanner") return { offers: await skyscannerSearch(p), source };
  return { offers: mockSearch(p), source };
}

/** Return options for a round-trip outbound flight (only needed for Google Flights results). */
export async function searchReturnFlights(p: FlightSearchParams, outbound: FlightOffer): Promise<FlightOffer[]> {
  const source = flightSource();
  if (source === "searchapi") return searchApiReturns(p, outbound);
  if (source === "mock") return mockReturns(p, outbound);
  return [];
}

const numKey = (legs: FlightLeg[]) => legs.map((l) => l.flightNumber.replace(/\s/g, "")).join("|");

/** Returns the latest price for a saved flight, or null if it can no longer be found. */
export async function refreshFlightPrice(f: SavedFlight): Promise<number | null> {
  const source = flightSource();
  if (source === "mock") return mockDrift(f.id, f.priceSaved);
  const out = f.legs[0];
  const back = f.legs[1];
  const params: FlightSearchParams = {
    from: out.from.code,
    to: out.to.code,
    depart: out.depart.slice(0, 10),
    returnDate: back?.depart.slice(0, 10),
    adults: f.passengers,
    cabin: f.cabin,
    currency: f.currency, // compare like with like: re-price in the currency it was saved in
  };
  if (source === "searchapi") {
    const outbound = (await searchApiSearch(params)).find((o) => numKey(o.legs) === numKey([out]));
    if (!outbound) return null;
    if (!back) return outbound.price;
    const full = (await searchApiReturns(params, outbound)).find((o) => numKey(o.legs) === numKey(f.legs));
    return full ? full.price : null;
  }
  const offers = await skyscannerSearch(params);
  const match = offers.find((o) => numKey(o.legs) === numKey(f.legs));
  return match ? match.price : null;
}

// ---------------------------------------------------------------------------
// Skyscanner Flights Live Prices v3
// ---------------------------------------------------------------------------

const CABIN_MAP: Record<Cabin, string> = {
  economy: "CABIN_CLASS_ECONOMY",
  premium_economy: "CABIN_CLASS_PREMIUM_ECONOMY",
  business: "CABIN_CLASS_BUSINESS",
  first: "CABIN_CLASS_FIRST",
};

type SkyDate = { year: number; month: number; day: number; hour?: number; minute?: number };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

function toSkyDate(day: string): SkyDate {
  const [year, month, d] = day.split("-").map(Number);
  return { year, month, day: d };
}

function fromSkyDate(d: SkyDate): string {
  const p = (n = 0) => String(n).padStart(2, "0");
  return `${d.year}-${p(d.month)}-${p(d.day)}T${p(d.hour)}:${p(d.minute)}`;
}

function priceToNumber(price: Json): number {
  const amount = Number(price?.amount ?? 0);
  switch (price?.unit) {
    case "PRICE_UNIT_CENTI":
      return amount / 100;
    case "PRICE_UNIT_MILLI":
      return amount / 1000;
    case "PRICE_UNIT_MICRO":
      return amount / 1_000_000;
    default:
      return amount;
  }
}

async function skyFetch(path: string, body?: unknown): Promise<Json> {
  const res = await fetch(`${SKY_BASE}${path}`, {
    method: "POST",
    headers: { "x-api-key": process.env.SKYSCANNER_API_KEY!, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Skyscanner ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

async function skyscannerSearch(p: FlightSearchParams): Promise<FlightOffer[]> {
  const currency = p.currency || process.env.SKYSCANNER_CURRENCY || "USD";
  const queryLegs = [
    { originPlaceId: { iata: p.from }, destinationPlaceId: { iata: p.to }, date: toSkyDate(p.depart) },
  ];
  if (p.returnDate) {
    queryLegs.push({ originPlaceId: { iata: p.to }, destinationPlaceId: { iata: p.from }, date: toSkyDate(p.returnDate) });
  }
  let data = await skyFetch("/flights/live/search/create", {
    query: {
      market: process.env.SKYSCANNER_MARKET || "UK",
      locale: process.env.SKYSCANNER_LOCALE || "en-GB",
      currency,
      queryLegs,
      adults: p.adults,
      cabinClass: CABIN_MAP[p.cabin],
    },
  });

  // Poll until complete (bounded so the request doesn't hang).
  const token = data.sessionToken;
  for (let i = 0; i < 6 && data.status !== "RESULT_STATUS_COMPLETE" && token; i++) {
    await new Promise((r) => setTimeout(r, 1200));
    data = await skyFetch(`/flights/live/search/poll/${token}`);
  }

  const results = data?.content?.results ?? {};
  const itineraries: Record<string, Json> = results.itineraries ?? {};
  const legs: Record<string, Json> = results.legs ?? {};
  const segments: Record<string, Json> = results.segments ?? {};
  const places: Record<string, Json> = results.places ?? {};
  const carriers: Record<string, Json> = results.carriers ?? {};
  const order: string[] = (data?.content?.sortingOptions?.cheapest ?? []).map((s: Json) => s.itineraryId);
  const ids = order.length ? order : Object.keys(itineraries);

  const toPlace = (placeId: string): Place => {
    const pl = places[placeId] ?? {};
    const known = pl.iata ? findAirport(pl.iata) : undefined;
    const parent = pl.parentId ? places[pl.parentId] : undefined;
    return (
      known ?? {
        code: pl.iata ?? "???",
        name: pl.name ?? "Unknown",
        city: parent?.name ?? pl.name ?? "",
        lat: pl.coordinates?.latitude ?? 0,
        lng: pl.coordinates?.longitude ?? 0,
      }
    );
  };

  const offers: FlightOffer[] = [];
  for (const id of ids.slice(0, 40)) {
    const it = itineraries[id];
    const option = it?.pricingOptions?.[0];
    if (!it || !option) continue;
    const parsedLegs: FlightLeg[] = (it.legIds as string[]).map((legId) => {
      const leg = legs[legId];
      const firstSeg = segments[leg.segmentIds?.[0]] ?? {};
      const carrier = carriers[leg.marketingCarrierIds?.[0]] ?? carriers[firstSeg.marketingCarrierId] ?? {};
      return {
        from: toPlace(leg.originPlaceId),
        to: toPlace(leg.destinationPlaceId),
        carrier: carrier.name ?? "Unknown airline",
        carrierCode: carrier.iata ?? carrier.displayCode,
        carrierLogo: carrier.imageUrl,
        flightNumber: `${carrier.iata ?? carrier.displayCode ?? ""} ${firstSeg.marketingFlightNumber ?? ""}`.trim(),
        depart: fromSkyDate(leg.departureDateTime),
        arrive: fromSkyDate(leg.arrivalDateTime),
        stops: leg.stopCount ?? 0,
        durationMins: leg.durationInMinutes ?? 0,
      };
    });
    offers.push({
      id,
      legs: parsedLegs,
      price: priceToNumber(option.price),
      currency,
      cabin: p.cabin,
      passengers: p.adults,
      bookingUrl: option.items?.[0]?.deepLink ?? "https://www.skyscanner.net",
      provider: "Skyscanner",
    });
  }
  return offers;
}

// ---------------------------------------------------------------------------
// Mock data (used when SKYSCANNER_API_KEY is not set)
// ---------------------------------------------------------------------------

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: string) {
  let x = hash(seed) || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}

function distanceKm(a: Place, b: Place) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const CARRIERS = [
  ["Air Canada", "AC"],
  ["American Airlines", "AA"],
  ["British Airways", "BA"],
  ["Virgin Atlantic", "VS"],
  ["Delta", "DL"],
  ["United", "UA"],
  ["Lufthansa", "LH"],
  ["KLM", "KL"],
  ["Wizz Air", "W6"],
  ["easyJet", "U2"],
] as const;

const CABIN_MULT: Record<Cabin, number> = { economy: 1, premium_economy: 1.8, business: 3.6, first: 6 };

function addMinutes(isoDay: string, mins: number) {
  const [y, m, d] = isoDay.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 0, 0) + mins * 60_000);
  return dt.toISOString().slice(0, 16);
}

function mockLeg(from: Place, to: Place, day: string, r: () => number, airline?: readonly [string, string]): FlightLeg {
  const km = distanceKm(from, to);
  const stops = km > 2500 && r() < 0.35 ? 1 : 0;
  const duration = Math.round(40 + km / 13.5 + stops * (70 + r() * 120));
  const departMins = Math.round((5.5 + r() * 16) * 12) * 5; // 05:30 - 21:30 on 5-min steps
  const tzShift = Math.round((to.lng - from.lng) / 15) * 60;
  const [carrier, code] = airline ?? CARRIERS[Math.floor(r() * CARRIERS.length)];
  return {
    from,
    to,
    carrier,
    carrierCode: code,
    flightNumber: `${code} ${Math.floor(10 + r() * 980)}`,
    depart: addMinutes(day, departMins),
    arrive: addMinutes(day, departMins + duration + tzShift),
    stops,
    durationMins: duration,
  };
}

function mockSearch(p: FlightSearchParams): FlightOffer[] {
  const from = findAirport(p.from) ?? AIRPORTS[0];
  const to = findAirport(p.to) ?? AIRPORTS[6];
  const r = rng(`${p.from}-${p.to}-${p.depart}-${p.returnDate ?? ""}-${p.cabin}`);
  const km = distanceKm(from, to);
  const offers: FlightOffer[] = [];
  for (let i = 0; i < 14; i++) {
    const airline = CARRIERS[Math.floor(r() * CARRIERS.length)];
    const legs = [mockLeg(from, to, p.depart, r, airline)];
    const base = (45 + km * 0.075) * (0.75 + r() * 0.8) * CABIN_MULT[p.cabin] * (p.returnDate ? 1.75 : 1);
    const stopDiscount = legs.some((l) => l.stops) ? 0.82 : 1;
    const price = fromUsd(base * stopDiscount * p.adults, p.currency);
    offers.push({
      id: `mock-${hash(JSON.stringify(legs))}`,
      legs,
      price,
      currency: p.currency,
      cabin: p.cabin,
      passengers: p.adults,
      bookingUrl: `https://www.skyscanner.net/transport/flights/${p.from.toLowerCase()}/${p.to.toLowerCase()}/${p.depart.slice(2).replace(/-/g, "")}/${p.returnDate ? p.returnDate.slice(2).replace(/-/g, "") + "/" : ""}`,
      provider: "Demo data",
      // Round trips work like Google Flights: pick an outbound, then load its returns.
      ...(p.returnDate ? { departureToken: `mock-${i}`, returnDate: p.returnDate } : {}),
    });
  }
  return offers.sort((a, b) => a.price - b.price);
}

/** Demo return options for a round-trip outbound flight; the cheapest matches the outbound's "from" price. */
function mockReturns(p: FlightSearchParams, outbound: FlightOffer): FlightOffer[] {
  const from = findAirport(p.to) ?? AIRPORTS[6];
  const to = findAirport(p.from) ?? AIRPORTS[0];
  const r = rng(`${outbound.id}-returns`);
  const out = outbound.legs[0];
  const sameAirline = CARRIERS.find(([, code]) => out.flightNumber.startsWith(code + " "));
  const offers: FlightOffer[] = [];
  for (let i = 0; i < 5; i++) {
    const back = mockLeg(from, to, p.returnDate!, r, i < 3 && sameAirline ? sameAirline : undefined);
    const extra = i === 0 ? 0 : fromUsd((10 + r() * 90) * outbound.passengers, outbound.currency);
    offers.push({ ...outbound, id: `${outbound.id}-r${i}`, legs: [out, back], price: outbound.price + extra, departureToken: undefined, returnDate: undefined });
  }
  return offers.sort((a, b) => a.price - b.price);
}

/** Deterministic price drift so the price-change colours can be demoed without an API key. */
function mockDrift(id: string, saved: number): number | null {
  if (id.startsWith("seed-")) return null; // demo rows keep their hand-picked prices
  const r = rng(id);
  const roll = r();
  if (roll < 0.4) return saved;
  const pct = 0.03 + r() * 0.12;
  return Math.round(saved * (roll < 0.75 ? 1 + pct : 1 - pct));
}
