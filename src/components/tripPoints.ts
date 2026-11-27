import { legForDay, type Lookup } from "./itinerary";
import type { MapPoint } from "./MapView";
import type { ItineraryItem, SavedActivity, SavedStay } from "@/lib/types";

/**
 * Everything on a trip's map:
 * - every saved stay (pin) and every saved event with a location (circle), whether or not
 *   it's on the itinerary yet — green when it is, grey when it isn't;
 * - arrival airports of flights on the itinerary (except the flight home);
 * - itinerary events are numbered in visit order (stays and flights aren't);
 * - `order` gives the visit order of itinerary items, for the dashed route line.
 */
export function tripMapPoints(
  tripId: string,
  data: { itinerary: ItineraryItem[]; stays: SavedStay[]; activities: SavedActivity[] },
  lookup: Lookup,
): MapPoint[] {
  const items = data.itinerary
    .filter((i) => i.tripId === tripId)
    .sort((a, b) => a.day.localeCompare(b.day) || a.position - b.position);
  const home = homeOf(items, lookup);

  const firstVisit = new Map<string, number>(); // "stay:id" / "activity:id" → visit order
  const pts: MapPoint[] = [];
  let order = 0;
  let eventNo = 0;
  for (const it of items) {
    if (it.kind === "flight") {
      const f = lookup.flights.get(it.refId);
      if (!f) continue;
      const leg = legForDay(f, it.day);
      // Flying back home isn't a place on the trip: leave the home airport off the map.
      if (home && (leg.to.code === home.code || (home.city && leg.to.city === home.city))) continue;
      if (!leg.to.lat && !leg.to.lng) continue; // airport without known coordinates
      pts.push({ id: `flight:${it.id}`, ref: `flight:${f.id}`, lat: leg.to.lat, lng: leg.to.lng, label: `Arrive ${leg.to.name} (${leg.to.code})`, kind: "flight", scheduled: true, order: order++ });
    } else {
      const key = `${it.kind}:${it.refId}`;
      if (!firstVisit.has(key)) firstVisit.set(key, order++);
    }
  }

  for (const s of data.stays) {
    if (s.tripId !== tripId || (!s.lat && !s.lng)) continue;
    const o = firstVisit.get(`stay:${s.id}`);
    pts.push({ id: `stay:${s.id}`, lat: s.lat, lng: s.lng, label: s.name, kind: "stay", scheduled: o != null, order: o });
  }

  const located = data.activities.filter((a) => a.tripId === tripId && a.lat != null && a.lng != null);
  const scheduled = located
    .filter((a) => firstVisit.has(`activity:${a.id}`))
    .sort((a, b) => firstVisit.get(`activity:${a.id}`)! - firstVisit.get(`activity:${b.id}`)!);
  const numbers = new Map(scheduled.map((a) => [a.id, ++eventNo]));
  for (const a of located) {
    const o = firstVisit.get(`activity:${a.id}`);
    pts.push({
      id: `activity:${a.id}`,
      lat: a.lat!,
      lng: a.lng!,
      label: o != null ? a.name : `${a.name} (not on the itinerary yet)`,
      kind: "activity",
      shape: "circle",
      scheduled: o != null,
      order: o,
      n: numbers.get(a.id),
    });
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
