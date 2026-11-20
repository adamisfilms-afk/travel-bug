import { NextResponse } from "next/server";
import { flightSource, refreshFlightPrice } from "@/lib/flights-server";
import { findHotel } from "@/lib/hotels";
import { PRICE_CHECK_MAX_AGE, searchApiEnabled, withMaxAge } from "@/lib/searchapi";
import { refreshStayPrice } from "@/lib/searchapi-hotels";
import { daysBetween } from "@/lib/format";
import type { SavedFlight, SavedStay } from "@/lib/types";

/** Deterministic price drift for the sample hotels (demo data only). */
function demoStayPrice(s: SavedStay): number {
  if (s.id.startsWith("seed-")) return s.priceCurrent;
  const hotel = findHotel(s.hotelId);
  if (!hotel) return s.priceCurrent;
  const nights = Math.max(1, daysBetween(s.checkIn, s.checkOut));
  let h = 0;
  for (const c of s.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const roll = (h % 100) / 100;
  const base = hotel.pricePerNight * nights;
  if (roll < 0.5) return s.priceSaved;
  return Math.round(s.priceSaved * (roll < 0.8 ? 1.06 : 0.93) || base);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const flights: SavedFlight[] = Array.isArray(body.flights) ? body.flights.slice(0, 30) : [];
  const stays: SavedStay[] = Array.isArray(body.stays) ? body.stays.slice(0, 30) : [];

  // Each live check costs a search credit, so:
  // - opening the planner reuses any response from the last PRICE_CHECK_TTL_MINUTES (default 6 hours),
  //   including the search the item was saved from; "Refresh prices" (`force`) reuses only the last 10 minutes;
  // - saved items with the same route/dates/hotel share one request;
  // - items already in the past, and demo trips' items, aren't checked.
  const live = flightSource() !== "mock";
  const force = body.force === true;
  const maxAge = force ? 10 * 60_000 : PRICE_CHECK_MAX_AGE;
  const today = new Date().toISOString().slice(0, 10);
  return withMaxAge(maxAge, () => check(flights, stays, live, today));
}

async function check(flights: SavedFlight[], stays: SavedStay[], live: boolean, today: string) {
  const flightPrices = await Promise.all(
    flights.map(async (f) => {
      if (live && (f.id.startsWith("seed-") || f.legs[0]?.depart.slice(0, 10) < today)) return { id: f.id, price: null };
      try {
        const check = await refreshFlightPrice(f);
        return { id: f.id, price: check?.price ?? null, bookingUrl: check?.bookingUrl, bookingOptions: check?.bookingOptions };
      } catch (e) {
        console.error(e);
        return { id: f.id, price: null };
      }
    }),
  );

  // Stays found through live hotel search ("ss-hotel-…") are re-priced live (1 credit each);
  // sample hotels keep their demo behaviour.
  const stayPrices = await Promise.all(
    stays.map(async (s) => {
      const liveStay = s.hotelId.startsWith("ss-hotel-") && searchApiEnabled();
      if (!liveStay) return { id: s.id, price: demoStayPrice(s) };
      if (s.checkIn < today) return { id: s.id, price: null };
      try {
        const check = await refreshStayPrice(s);
        return { id: s.id, price: check?.price ?? null, bookingUrl: check?.bookingUrl, bookingOptions: check?.bookingOptions };
      } catch (e) {
        console.error(e);
        return { id: s.id, price: null };
      }
    }),
  );

  return NextResponse.json({
    flights: flightPrices,
    stays: stayPrices,
    checkedAt: new Date().toISOString(),
  });
}
