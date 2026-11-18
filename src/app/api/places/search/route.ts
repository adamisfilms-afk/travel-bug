import { NextResponse } from "next/server";

export interface PlaceResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

/**
 * Place search for adding a location to an itinerary event.
 * Uses Mapbox's geocoding when NEXT_PUBLIC_MAPBOX_TOKEN is set, otherwise OpenStreetMap's
 * Nominatim (free; fine for low-volume use — its policy allows about one request a second).
 * `near=lat,lng` biases results towards the trip's area.
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const q = (params.get("q") ?? "").trim().slice(0, 200);
  if (q.length < 2) return NextResponse.json({ results: [] });
  const [lat, lng] = (params.get("near") ?? "").split(",").map(Number);
  const near = Number.isFinite(lat) && Number.isFinite(lng) && (lat || lng) ? { lat, lng } : null;

  try {
    const results = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ? await mapbox(q, near) : await nominatim(q, near);
    return NextResponse.json({ results });
  } catch (e) {
    console.error("[places]", e);
    return NextResponse.json({ error: "Place search failed. Try again in a moment." }, { status: 502 });
  }
}

async function mapbox(q: string, near: { lat: number; lng: number } | null): Promise<PlaceResult[]> {
  const qs = new URLSearchParams({ q, limit: "6", access_token: process.env.NEXT_PUBLIC_MAPBOX_TOKEN! });
  if (near) qs.set("proximity", `${near.lng},${near.lat}`);
  const res = await fetch(`https://api.mapbox.com/search/geocode/v6/forward?${qs}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Mapbox ${res.status}`);
  const data = await res.json();
  return (data.features ?? []).map((f: { properties: { name?: string; full_address?: string; place_formatted?: string; coordinates?: { latitude: number; longitude: number } }; geometry?: { coordinates: [number, number] } }) => ({
    name: f.properties.name ?? f.properties.full_address ?? q,
    address: f.properties.full_address ?? f.properties.place_formatted ?? "",
    lat: f.properties.coordinates?.latitude ?? f.geometry?.coordinates[1] ?? 0,
    lng: f.properties.coordinates?.longitude ?? f.geometry?.coordinates[0] ?? 0,
  }));
}

async function nominatim(q: string, near: { lat: number; lng: number } | null): Promise<PlaceResult[]> {
  const qs = new URLSearchParams({ q, format: "jsonv2", limit: "6", addressdetails: "0" });
  if (near) {
    // Prefer (but don't restrict to) roughly 50 km around the trip
    const d = 0.45;
    qs.set("viewbox", `${near.lng - d},${near.lat + d},${near.lng + d},${near.lat - d}`);
  }
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${qs}`, {
    headers: { "User-Agent": "TravelBug/0.1 (trip planner)", "Accept-Language": "en" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const data: { name?: string; display_name: string; lat: string; lon: string }[] = await res.json();
  return data.map((r) => ({
    name: r.name || r.display_name.split(",")[0],
    address: r.display_name,
    lat: Number(r.lat),
    lng: Number(r.lon),
  }));
}
