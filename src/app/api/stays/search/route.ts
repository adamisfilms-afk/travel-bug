import { NextResponse } from "next/server";
import { DEFAULT_CURRENCY, isCurrency } from "@/lib/currency";
import { searchHotels } from "@/lib/hotels";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const q = params.get("q") ?? "";
  const c = params.get("currency");
  const currency = isCurrency(c) ? c : DEFAULT_CURRENCY;
  return NextResponse.json({ hotels: searchHotels(q, currency), source: "mock", currency });
}
