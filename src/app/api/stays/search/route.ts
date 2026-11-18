import { NextResponse } from "next/server";
import { searchHotels } from "@/lib/hotels";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  return NextResponse.json({ hotels: searchHotels(q), source: "mock" });
}
