import { NextResponse } from "next/server";

export interface PlaceResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

/**
 * Place search for adding a location to an itinerary event (landmarks, venues, addresses).
 *
 * - With NEXT_PUBLIC_MAPBOX_TOKEN: Mapbox's Search Box API (POIs and businesses — the plain
 *   geocoding API only knows addresses and places, which is why "Schönbrunn Palace" used to
 *   match a random address) merged with OpenStreetMap results.
 * - Without it: OpenStreetMap's Nominatim only (free; its policy allows about one request a second).
 *
 * `near=lat,lng` biases results towards the trip's area.
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const q = (params.get("q") ?? "").trim().slice(0, 200);
  if (q.length < 2) return NextResponse.json({ results: [] });
  const [lat, lng] = (params.get("near") ?? "").split(",").map(Number);
  const near = Number.isFinite(lat) && Number.isFinite(lng) && (lat || lng) ? { lat, lng } : null;

  try {
    const sources = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ? [searchBox(q, near), nominatim(q, near)] : [nominatim(q, near)];
    const settled = await Promise.allSettled(sources);
    const lists = settled.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
    if (!lists.length) throw (settled[0] as PromiseRejectedResult).reason;
    return NextResponse.json({ results: merge(lists, near, q).slice(0, 8) });
  } catch (e) {
    console.error("[places]", e);
    return NextResponse.json({ error: "Place search failed. Try again in a moment." }, { status: 502 });
  }
}

/** Mapbox Search Box API, single-request text search (landmarks, businesses, addresses). */
async function searchBox(q: string, near: { lat: number; lng: number } | null): Promise<PlaceResult[]> {
  const qs = new URLSearchParams({ q, limit: "6", language: "en", access_token: process.env.NEXT_PUBLIC_MAPBOX_TOKEN! });
  if (near) qs.set("proximity", `${near.lng},${near.lat}`);
  const res = await fetch(`https://api.mapbox.com/search/searchbox/v1/forward?${qs}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Mapbox Search Box ${res.status}`);
  const data = await res.json();
  type F = {
    properties: { name?: string; full_address?: string; place_formatted?: string; address?: string; coordinates?: { latitude: number; longitude: number } };
    geometry?: { coordinates: [number, number] };
  };
  return (data.features ?? []).map((f: F) => ({
    name: f.properties.name ?? f.properties.full_address ?? q,
    address: f.properties.full_address ?? f.properties.place_formatted ?? f.properties.address ?? "",
    lat: f.properties.coordinates?.latitude ?? f.geometry?.coordinates[1] ?? 0,
    lng: f.properties.coordinates?.longitude ?? f.geometry?.coordinates[0] ?? 0,
  }));
}

const km = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};

/**
 * Interleave the providers' results, drop near-duplicates,
 * and list places near the trip first.
 */
function merge(lists: PlaceResult[][], near: { lat: number; lng: number } | null, q = ""): PlaceResult[] {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  // How many of the searched words a result's name contains (to keep the best-named duplicate)
  const score = (r: PlaceResult) => words.filter((w) => r.name.toLowerCase().includes(w)).length;
  const out: PlaceResult[] = [];
  const longest = Math.max(...lists.map((l) => l.length));
  for (let i = 0; i < longest; i++) {
    for (const l of lists) {
      const r = l[i];
      if (!r || (!r.lat && !r.lng)) continue;
      // Same spot (~100 m), or same-ish name within ~300 m (e.g. "Schönbrunn Palace" / "Schloss Schönbrunn")
      const j = out.findIndex((o) => {
        const d = km(o, r);
        const a1 = o.name.toLowerCase();
        const b1 = r.name.toLowerCase();
        return d < 0.1 || (d < 0.3 && (a1.includes(b1) || b1.includes(a1)));
      });
      if (j < 0) out.push(r);
      else if (score(r) > score(out[j])) out[j] = r;
    }
  }
  if (!near) return out;
  // Stable: places within ~150 km of the trip keep their order but come before far-away ones.
  return out.map((r, i) => ({ r, i, far: km(near, r) > 150 })).sort((a, b) => Number(a.far) - Number(b.far) || a.i - b.i).map((x) => x.r);
}

async function nominatim(q: string, near: { lat: number; lng: number } | null): Promise<PlaceResult[]> {
  const qs = new URLSearchParams({ q, format: "jsonv2", limit: "6", addressdetails: "0", "accept-language": "en" });
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
