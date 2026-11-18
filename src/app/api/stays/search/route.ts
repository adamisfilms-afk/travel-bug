import { NextResponse } from "next/server";
import { DEFAULT_CURRENCY, isCurrency } from "@/lib/currency";
import { searchHotels } from "@/lib/hotels";
import { searchApiEnabled } from "@/lib/searchapi";
import { skyscannerHotels } from "@/lib/searchapi-hotels";

/** Hotel search: Skyscanner via SearchApi when SEARCHAPI_API_KEY is set (1 credit), else demo hotels. */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const q = (params.get("q") ?? "").trim();
  const c = params.get("currency");
  const currency = isCurrency(c) ? c : DEFAULT_CURRENCY;
  const checkIn = params.get("checkIn") ?? "";
  const checkOut = params.get("checkOut") ?? "";
  const adults = Math.min(10, Math.max(1, Number(params.get("guests")) || 2));

  const useLive = searchApiEnabled() && process.env.HOTEL_PROVIDER !== "mock";
  if (!useLive) return NextResponse.json({ hotels: searchHotels(q, currency), source: "mock", currency });

  if (!q) return NextResponse.json({ error: "Enter a city, hotel or landmark." }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOut) || checkOut <= checkIn) {
    return NextResponse.json({ error: "Choose check-in and check-out dates." }, { status: 400 });
  }
  try {
    const hotels = await skyscannerHotels({ q, checkIn, checkOut, adults, currency });
    return NextResponse.json({ hotels, source: "skyscanner", currency });
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "";
    return NextResponse.json({ error: msg ? `Hotel search failed: ${msg}` : "Hotel search failed." }, { status: 502 });
  }
}
