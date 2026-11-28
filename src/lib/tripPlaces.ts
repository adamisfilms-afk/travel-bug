"use client";

import type { CuratedGuide } from "./curated/types";
import { useSettings } from "./settingsStore";
import { useStore } from "./store";
import type { ActivityCategory, Hotel } from "./types";

/**
 * Adding a place (from a City Guide, the place view or the trip assistant) to a trip.
 * Hotels and other stays go to the trip's Stays; everything else to Food or Explore.
 */

export interface PlaceToAdd {
  name: string;
  category: ActivityCategory;
  lat: number | null;
  lng: number | null;
  /** A hotel / place to stay: saved as a stay (Stays tab), not an activity. */
  stay?: boolean;
  area?: string;
  city?: string;
  imageUrl?: string | null;
  /** Live price, when known (trip assistant): per night and for the whole stay. */
  nightly?: number | null;
  total?: number | null;
  currency?: string | null;
  bookingUrl?: string | null;
  rating?: number | null;
  reviews?: number | null;
}

/** Whether a curated place is a stay (it's in the guide's Stays / hotels section). */
export function isCuratedStay(guide: CuratedGuide, placeId: string): boolean {
  const section = guide.sections.find((s) => s.places.some((p) => p.id === placeId));
  return !!section && /stay|hotel/i.test(`${section.id} ${section.title}`);
}

export function addPlaceToTrip(tripId: string, p: PlaceToAdd) {
  const store = useStore.getState();
  if (!p.stay) return store.addActivity(tripId, { name: p.name, category: p.category, lat: p.lat, lng: p.lng, place: p.name });
  const trip = store.trips.find((t) => t.id === tripId);
  if (!trip) return;
  const nights = Math.max(1, Math.round((Date.parse(trip.endDate) - Date.parse(trip.startDate)) / 86_400_000));
  // A hotel without a live price is saved at 0: the planner shows "Check price" and the next
  // price check (opening the planner / Refresh prices) looks it up by name for the trip's dates.
  const hotel: Hotel = {
    id: `place:${p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name: p.name,
    stars: 0,
    area: p.area ?? "",
    city: p.city ?? trip.destination,
    lat: p.lat ?? 0,
    lng: p.lng ?? 0,
    rating: p.rating ?? 0,
    reviews: p.reviews ?? 0,
    tags: [],
    amenities: [],
    pricePerNight: p.nightly ?? 0,
    totalPrice: p.total ?? (p.nightly ? p.nightly * nights : 0),
    currency: p.currency ?? useSettings.getState().currency,
    provider: p.nightly ? "Skyscanner" : "",
    roomType: "",
    bookingUrl: p.bookingUrl ?? "",
    imageColor: "#C9B8A4",
    images: p.imageUrl ? [p.imageUrl] : undefined,
  };
  return store.saveStay(tripId, hotel, trip.startDate, trip.endDate, trip.travellers);
}

/** Remove a place from a trip, wherever it was saved (Stays or Food/Explore). */
export function removePlaceFromTrip(tripId: string, name: string) {
  const store = useStore.getState();
  const n = name.toLowerCase();
  store.activities.filter((a) => a.tripId === tripId && a.name.toLowerCase() === n).forEach((a) => store.removeActivity(a.id));
  store.stays.filter((s) => s.tripId === tripId && s.name.toLowerCase() === n).forEach((s) => store.removeStay(s.id));
}

/** Trips this place is saved to (as a stay or an activity). */
export function useTripsWithPlace(name: string): string[] {
  const n = name.toLowerCase();
  const activities = useStore((s) => s.activities);
  const stays = useStore((s) => s.stays);
  return [...new Set([...activities.filter((a) => a.name.toLowerCase() === n).map((a) => a.tripId), ...stays.filter((s) => s.name.toLowerCase() === n).map((s) => s.tripId)])];
}
