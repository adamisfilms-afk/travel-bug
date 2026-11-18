import { legForDay, type Lookup } from "./itinerary";
import type { MapPoint } from "./MapView";
import type { ItineraryItem } from "@/lib/types";

/** Map pins for the located items of an itinerary, numbered in visit order. */
export function itineraryPoints(items: ItineraryItem[], lookup: Lookup): MapPoint[] {
  const ordered = [...items].sort((a, b) => a.day.localeCompare(b.day) || a.position - b.position);
  const home = homeOf(ordered, lookup);
  const pts: MapPoint[] = [];
  const seen = new Set<string>();
  for (const it of ordered) {
    let p: Omit<MapPoint, "n"> | null = null;
    if (it.kind === "flight") {
      const f = lookup.flights.get(it.refId);
      if (f) {
        const leg = legForDay(f, it.day);
        // Flying back home isn't a place on the trip: leave the home airport off the map.
        if (home && (leg.to.code === home.code || (home.city && leg.to.city === home.city))) continue;
        if (!leg.to.lat && !leg.to.lng) continue; // airport without known coordinates
        p = { id: it.id, lat: leg.to.lat, lng: leg.to.lng, label: `Arrive ${leg.to.name} (${leg.to.code})`, kind: "flight" };
      }
    } else if (it.kind === "stay") {
      const s = lookup.stays.get(it.refId);
      if (s) p = { id: it.id, lat: s.lat, lng: s.lng, label: s.name, kind: "stay" };
    } else {
      const a = lookup.activities.get(it.refId);
      if (a && a.lat != null && a.lng != null) p = { id: it.id, lat: a.lat, lng: a.lng, label: a.name, kind: "activity" };
    }
    if (!p) continue;
    const key = `${p.lat},${p.lng}`;
    if (seen.has(key)) continue; // e.g. check-in and check-out of the same hotel
    seen.add(key);
    pts.push({ ...p, n: pts.length + 1 });
  }
  return pts;
}

/**
 * Where the trip starts from: the origin of the earliest flight in the itinerary.
 * Matching by city as well catches returns to a different airport (out LHR, back LGW).
 */
function homeOf(ordered: ItineraryItem[], lookup: Lookup): { code: string; city?: string } | null {
  let first: { depart: string; code: string; city?: string } | null = null;
  for (const it of ordered) {
    if (it.kind !== "flight") continue;
    const f = lookup.flights.get(it.refId);
    const leg = f?.legs[0];
    if (leg && (!first || leg.depart < first.depart)) first = { depart: leg.depart, code: leg.from.code, city: leg.from.city };
  }
  return first;
}
