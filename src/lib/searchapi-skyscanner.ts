import "server-only";
import { isoOf, placeOf, priceOf, searchApiCall, type Json, type SearchApiParams } from "./searchapi";
import type { BookingOption, Cabin, FlightLeg, FlightOffer } from "./types";

/**
 * Skyscanner results via SearchApi.io (engine=skyscanner_flights).
 *
 * One request returns complete itineraries (both legs for round trips), each with the
 * sellers Skyscanner lists (airline or travel agent), their prices and booking links.
 * Booking links go to the seller's booking page through Skyscanner, which is what
 * Skyscanner's affiliate programme pays on; set AFFILIATE_LINK_TEMPLATE to wrap them.
 *
 * The response is parsed defensively (several field names are accepted) because only
 * part of the schema is documented; set SEARCHAPI_DEBUG=1 to log the raw shape.
 */

const CABIN: Record<Cabin, string> = {
  economy: "economy",
  premium_economy: "premium_economy",
  business: "business",
  first: "first",
};

const str = (...vals: unknown[]) => vals.find((v) => typeof v === "string" && v.trim()) as string | undefined;

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^\d.]/g, ""));
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  if (v && typeof v === "object") return priceOf({ price: v });
  return null;
}

/** Durations may be minutes (number) or text like "7h 5m" / "PT7H5M". */
function minutes(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const h = Number(v.match(/(\d+)\s*h/i)?.[1] ?? v.match(/(\d+)H/)?.[1] ?? 0);
    const m = Number(v.match(/(\d+)\s*m(?!o)/i)?.[1] ?? v.match(/(\d+)M/)?.[1] ?? 0);
    if (h || m) return h * 60 + m;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function airlineOf(seg: Json): { name: string; code?: string } {
  const a = seg?.airline ?? seg?.marketing_carrier ?? seg?.carrier ?? seg?.operating_carrier;
  if (a && typeof a === "object") {
    return { name: str(a.name, a.display_name) ?? "Unknown airline", code: str(a.iata, a.code, a.display_code, a.id)?.toUpperCase() };
  }
  const fn = str(seg?.flight_number) ?? "";
  return { name: str(a, seg?.airline_name) ?? "Unknown airline", code: str(seg?.airline_code, seg?.carrier_code) ?? fn.split(/\s+/)[0] };
}

function legOf(leg: Json, fallbackDay: string): FlightLeg | null {
  const segs: Json[] = leg?.flights ?? leg?.segments ?? [];
  const first = segs[0] ?? leg;
  const last = segs[segs.length - 1] ?? leg;
  const dep = leg?.departure_airport ?? first?.departure_airport ?? leg?.origin;
  const arr = leg?.arrival_airport ?? last?.arrival_airport ?? leg?.destination;
  if (!dep || !arr) return null;
  const { name, code } = airlineOf(first);
  let flightNumber = str(first?.flight_number) ?? "";
  if (flightNumber && code && !flightNumber.toUpperCase().startsWith(code)) flightNumber = `${code} ${flightNumber}`;
  const segMins = segs.reduce((n, s) => n + minutes(s?.duration), 0);
  return {
    from: placeOf(dep),
    to: placeOf(arr),
    carrier: name,
    carrierCode: code,
    flightNumber: flightNumber || code || "—",
    depart: isoOf(leg?.departure_time ? { time: leg.departure_time } : dep, fallbackDay),
    arrive: isoOf(leg?.arrival_time ? { time: leg.arrival_time } : arr, fallbackDay),
    stops: num(leg?.stops) ?? num(leg?.stop_count) ?? Math.max(0, segs.length - 1),
    durationMins: minutes(leg?.duration ?? leg?.total_duration ?? leg?.duration_in_minutes) || segMins,
  };
}

function sellersOf(it: Json): BookingOption[] {
  const lists: Json[][] = [it?.booking_options, it?.pricing_options, it?.sellers, it?.agents, it?.offers, it?.deals].filter(Array.isArray);
  const out: BookingOption[] = [];
  for (const list of lists) {
    for (const o of list) {
      const agent = o?.seller ?? o?.agent ?? o?.provider ?? o?.booking_partner;
      const url = str(o?.link, o?.url, o?.booking_link, o?.deep_link, o?.deeplink, o?.tracking_link, o?.items?.[0]?.url, o?.items?.[0]?.deep_link);
      if (!url) continue;
      const name = str(o?.name, o?.title, typeof agent === "string" ? agent : agent?.name, o?.agent_name, o?.seller_name) ?? "Book";
      out.push({ name, price: num(o?.price ?? o?.amount ?? o?.total_price), url });
    }
  }
  return out.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
}

/** Wrap Skyscanner links in the affiliate tracking template, if one is configured ("{url}" placeholder). */
export function affiliate(url: string): string {
  const tpl = process.env.AFFILIATE_LINK_TEMPLATE;
  if (!tpl || !tpl.includes("{url}")) return url;
  try {
    if (!new URL(url).hostname.includes("skyscanner")) return url;
  } catch {
    return url;
  }
  return tpl.replace("{url}", encodeURIComponent(url));
}

export function skyscannerSearchUrl(p: SearchApiParams) {
  const d = (s: string) => s.slice(2).replace(/-/g, "");
  return `https://www.skyscanner.net/transport/flights/${p.from.toLowerCase()}/${p.to.toLowerCase()}/${d(p.depart)}/${p.returnDate ? d(p.returnDate) + "/" : ""}?adultsv2=${p.adults}`;
}

export async function skyscannerViaSearchApi(p: SearchApiParams): Promise<FlightOffer[]> {
  const data = await searchApiCall("skyscanner_flights", {
    departure_id: p.from,
    arrival_id: p.to,
    outbound_date: p.depart,
    return_date: p.returnDate,
    flight_type: p.returnDate ? "round_trip" : "one_way",
    adults: p.adults,
    travel_class: CABIN[p.cabin],
    currency: p.currency,
  });
  const itineraries: Json[] = data?.itineraries ?? data?.results ?? [];
  const offers: FlightOffer[] = [];
  itineraries.forEach((it, i) => {
    const rawLegs: Json[] = it?.legs ?? [];
    const legs = rawLegs.map((l, j) => legOf(l, j === 0 ? p.depart : p.returnDate ?? p.depart)).filter(Boolean) as FlightLeg[];
    const sellers = sellersOf(it).map((s) => ({ ...s, url: affiliate(s.url) }));
    const price = num(it?.price) ?? sellers[0]?.price ?? null;
    if (!legs.length || price == null) return;
    const itineraryLink = str(it?.tracking_link, it?.link, it?.url, it?.booking_link);
    offers.push({
      id: `ss-${str(it?.id) ?? i}`,
      legs,
      price,
      currency: p.currency,
      cabin: p.cabin,
      passengers: p.adults,
      bookingUrl: sellers[0]?.url ?? affiliate(itineraryLink ?? skyscannerSearchUrl(p)),
      bookingOptions: sellers.length ? sellers : undefined,
      provider: "Skyscanner",
    });
  });
  if (!offers.length && itineraries.length) {
    throw new Error("SearchApi returned Skyscanner results in an unexpected format (set SEARCHAPI_DEBUG=1 to log it).");
  }
  return offers;
}
