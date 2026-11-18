import { NextResponse } from "next/server";
import { refreshFlightPrice } from "@/lib/flights-server";
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

  const flightPrices = await Promise.all(
    flights.map(async (f) => {
      try {
        return { id: f.id, price: await refreshFlightPrice(f) };
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
