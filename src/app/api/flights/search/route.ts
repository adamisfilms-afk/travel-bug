import { NextResponse } from "next/server";
import { guardPaid } from "@/lib/guard";
import { DEFAULT_CURRENCY, isCurrency } from "@/lib/currency";
import { searchFlights } from "@/lib/flights-server";
import type { Cabin } from "@/lib/types";

const CABINS: Cabin[] = ["economy", "premium_economy", "business", "first"];

export async function POST(req: Request) {
  const blocked = await guardPaid();
  if (blocked) return blocked;
  const body = await req.json().catch(() => ({}));
  const from = String(body.from ?? "").toUpperCase();
  const to = String(body.to ?? "").toUpperCase();
  const depart = String(body.depart ?? "");
  const returnDate = body.returnDate ? String(body.returnDate) : undefined;
  const adults = Math.min(9, Math.max(1, Number(body.adults) || 1));
  const cabin: Cabin = CABINS.includes(body.cabin) ? body.cabin : "economy";
  const currency = isCurrency(body.currency) ? body.currency : DEFAULT_CURRENCY;

  if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to) || !/^\d{4}-\d{2}-\d{2}$/.test(depart)) {
    return NextResponse.json({ error: "Choose an origin, a destination and a departure date." }, { status: 400 });
  }
  if (returnDate && returnDate < depart) {
    return NextResponse.json({ error: "Return date must be after the departure date." }, { status: 400 });
  }

  try {
    const result = await searchFlights({ from, to, depart, returnDate, adults, cabin, currency });
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    // Surface the provider's message (e.g. invalid key, out of credits) so it's actionable.
    const msg = e instanceof Error ? e.message : "";
    return NextResponse.json({ error: msg ? `Flight search failed: ${msg}` : "Flight search failed. Please try again." }, { status: 502 });
  }
}
