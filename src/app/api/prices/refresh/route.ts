import { NextResponse } from "next/server";
import { flightSource, refreshFlightPrice } from "@/lib/flights-server";
import { findHotel } from "@/lib/hotels";
import { daysBetween } from "@/lib/format";
import type { SavedFlight, SavedStay } from "@/lib/types";

/** Deterministic hotel drift for demo purposes (no live hotel provider yet). */
function stayPrice(s: SavedStay): number {
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

  // Prices are checked live. To avoid paying twice when you hop between pages, a flight
  // checked in the last few minutes is skipped unless `force` is set ("Refresh prices").
  // Demo trips' flights are never re-priced with a live provider.
  const live = flightSource() !== "mock";
  const force = body.force === true;
  const recent = (f: SavedFlight) => f.priceCheckedAt && Date.now() - Date.parse(f.priceCheckedAt) < 5 * 60_000;

  const flightPrices = await Promise.all(
    flights.map(async (f) => {
      if (live && (f.id.startsWith("seed-") || (!force && recent(f)))) return { id: f.id, price: null };
      try {
        const check = await refreshFlightPrice(f);
        return { id: f.id, price: check?.price ?? null, bookingUrl: check?.bookingUrl, bookingOptions: check?.bookingOptions };
      } catch (e) {
        console.error(e);
        return { id: f.id, price: null };
      }
    }),
  );

  return NextResponse.json({
    flights: flightPrices,
    stays: stays.map((s) => ({ id: s.id, price: stayPrice(s) })),
    checkedAt: new Date().toISOString(),
  });
}
