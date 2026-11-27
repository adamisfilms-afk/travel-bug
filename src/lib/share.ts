"use client";

import { useEffect } from "react";
import { siteUrl } from "./site";
import { useStore } from "./store";
import type { ItineraryItem, SavedActivity, SavedFlight, SavedStay, Trip } from "./types";

/** What a shared itinerary link shows: one trip and everything saved to it. */
export interface SharedTrip {
  trip: Pick<Trip, "id" | "name" | "destination" | "locations" | "startDate" | "endDate" | "travellers">;
  flights: SavedFlight[];
  stays: SavedStay[];
  activities: SavedActivity[];
  itinerary: ItineraryItem[];
}

type Data = { trips: Trip[]; flights: SavedFlight[]; stays: SavedStay[]; activities: SavedActivity[]; itinerary: ItineraryItem[] };

export function snapshotFor(trip: Trip, d: Data): SharedTrip {
  const mine = <T extends { tripId: string }>(xs: T[]) => xs.filter((x) => x.tripId === trip.id);
  const { id, name, destination, locations, startDate, endDate, travellers } = trip;
  return {
    trip: { id, name, destination, locations, startDate, endDate, travellers },
    flights: mine(d.flights),
    stays: mine(d.stays),
    activities: mine(d.activities),
    itinerary: mine(d.itinerary),
  };
}

const token = (n: number) => {
  const bytes = crypto.getRandomValues(new Uint8Array(n));
  return Array.from(bytes, (b) => "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[b % 62]).join("");
};

export const shareUrl = (shareId: string) => `${siteUrl()}/share/${shareId}`;

const lastPushed = new Map<string, string>();

export async function publish(trip: Trip, d: Data): Promise<void> {
  if (!trip.shareId || !trip.shareKey) return;
  const data = snapshotFor(trip, d);
  const json = JSON.stringify(data);
  if (lastPushed.get(trip.shareId) === json) return;
  const res = await fetch(`/api/share/${trip.shareId}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ key: trip.shareKey, data }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? `Share failed (${res.status})`);
  lastPushed.set(trip.shareId, json);
}

/** Turns sharing on for a trip (if it isn't already), publishes it, and returns its public link. */
export async function shareTrip(tripId: string): Promise<string> {
  const st = useStore.getState();
  let trip = st.trips.find((t) => t.id === tripId);
  if (!trip) throw new Error("Trip not found.");
  if (!trip.shareId || !trip.shareKey) {
    st.updateTrip(trip.id, { shareId: trip.shareId ?? token(12), shareKey: trip.shareKey ?? token(32) });
    trip = useStore.getState().trips.find((t) => t.id === tripId)!;
  }
  await publish(trip, useStore.getState());
  return shareUrl(trip.shareId!);
}

/** Keeps every shared trip's public copy up to date: re-publishes shortly after it changes. */
export function useShareSync() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const run = () => {
      const st = useStore.getState();
      if (!st.ready) return;
      for (const t of st.trips) if (t.shareId) publish(t, st).catch((e) => console.warn("[share]", e));
    };
    const unsub = useStore.subscribe(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(run, 1500);
    });
    run();
    return () => {
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, []);
}
