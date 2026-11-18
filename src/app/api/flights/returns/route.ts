import { NextResponse } from "next/server";
import { searchReturnFlights } from "@/lib/flights-server";
import type { Cabin, FlightOffer } from "@/lib/types";

const CABINS: Cabin[] = ["economy", "premium_economy", "business", "first"];

/** Return flights for a chosen round-trip outbound flight (costs one search credit, cached 30 min). */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const outbound = body.outbound as FlightOffer | undefined;
  if (!outbound?.departureToken || !outbound.returnDate || !outbound.legs?.[0]) {
    return NextResponse.json({ error: "Missing outbound flight." }, { status: 400 });
  }
  const leg = outbound.legs[0];
  try {
    const offers = await searchReturnFlights(
      {
        from: leg.from.code,
        to: leg.to.code,
        depart: leg.depart.slice(0, 10),
        returnDate: outbound.returnDate,
        adults: Math.min(9, Math.max(1, Number(outbound.passengers) || 1)),
        cabin: CABINS.includes(outbound.cabin) ? outbound.cabin : "economy",
      },
      outbound,
    );
    return NextResponse.json({ offers });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't load return flights." }, { status: 502 });
  }
}
