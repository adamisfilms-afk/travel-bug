"use client";

import { create } from "zustand";
import { getBackend, TABLE_FOR, type Backend } from "./backend";
import { daysBetween, uid } from "./format";
import { SEED } from "./seed";
import type {
  ActivityCategory,
  FlightOffer,
  Hotel,
  ItemKind,
  ItineraryItem,
  SavedActivity,
  SavedFlight,
  SavedStay,
  Trip,
  TripData,
} from "./types";

type Key = keyof TripData;

interface State extends TripData {
  ready: boolean;
  backendKind: Backend["kind"];
  loadError: string | null;
  init(): Promise<void>;

  createTrip(input: Omit<Trip, "id" | "createdAt">): Trip;
  updateTrip(id: string, patch: Partial<Omit<Trip, "id">>): void;
  deleteTrip(id: string): void;

  saveFlight(tripId: string, offer: FlightOffer): SavedFlight;
  removeFlight(id: string): void;

  saveStay(tripId: string, hotel: Hotel, checkIn: string, checkOut: string): SavedStay;
  removeStay(id: string): void;

  addActivity(tripId: string, a: { name: string; category: ActivityCategory; lat?: number | null; lng?: number | null; notes?: string }): SavedActivity;
  removeActivity(id: string): void;

  addToItinerary(tripId: string, day: string, kind: ItemKind, refId: string, index?: number, time?: string | null): void;
  moveItineraryItem(id: string, day: string, index: number): void;
  setItemTime(id: string, time: string | null): void;
  removeItineraryItem(id: string): void;

  applyPrices(flights: { id: string; price: number | null }[], stays: { id: string; price: number | null }[], checkedAt: string): void;
}

const EMPTY: TripData = { trips: [], flights: [], stays: [], activities: [], itinerary: [] };

let backend: Backend | null = null;

/** Persist a change: rows to upsert and ids to delete, per collection. */
function persist(get: () => State, upserts: Partial<Record<Key, object[]>>, deletes: Partial<Record<Key, string[]>> = {}) {
  if (!backend) return;
  if (backend.snapshot) {
    const s = get();
    backend.snapshot({ trips: s.trips, flights: s.flights, stays: s.stays, activities: s.activities, itinerary: s.itinerary });
    return;
  }
  // Deletes of children first, then parents; upserts parents first.
  const order: Key[] = ["trips", "flights", "stays", "activities", "itinerary"];
  void (async () => {
    for (const k of [...order].reverse()) if (deletes[k]?.length) await backend!.remove!(TABLE_FOR[k], deletes[k]!);
    for (const k of order) if (upserts[k]?.length) await backend!.upsert!(TABLE_FOR[k], upserts[k]!);
  })();
}

/** Items of one trip day, ordered by position. */
function dayItems(items: ItineraryItem[], tripId: string, day: string): ItineraryItem[] {
  return items
    .filter((i) => i.tripId === tripId && i.day === day)
    .sort((a, b) => a.position - b.position);
}

export const useStore = create<State>((set, get) => ({
  ...EMPTY,
  ready: false,
  backendKind: "local",
  loadError: null,

  async init() {
    if (backend) return;
    backend = getBackend();
    set({ backendKind: backend.kind });
    try {
      const data = await backend.load();
      if (data) set({ ...EMPTY, ...data });
      else if (backend.kind === "local") {
        set({ ...SEED });
        backend.snapshot?.(SEED);
      }
    } catch (e) {
      set({ loadError: e instanceof Error ? e.message : String(e) });
    }
    set({ ready: true });
  },

  createTrip(input) {
    const trip: Trip = { ...input, id: uid(), createdAt: new Date().toISOString() };
    set((s) => ({ trips: [...s.trips, trip] }));
    persist(get, { trips: [trip] });
    return trip;
  },

  updateTrip(id, patch) {
    set((s) => ({ trips: s.trips.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
    const t = get().trips.find((x) => x.id === id);
    if (t) persist(get, { trips: [t] });
  },

  deleteTrip(id) {
    const s = get();
    const del = {
      itinerary: s.itinerary.filter((i) => i.tripId === id).map((i) => i.id),
      flights: s.flights.filter((i) => i.tripId === id).map((i) => i.id),
      stays: s.stays.filter((i) => i.tripId === id).map((i) => i.id),
      activities: s.activities.filter((i) => i.tripId === id).map((i) => i.id),
      trips: [id],
    };
    set((st) => ({
      trips: st.trips.filter((t) => t.id !== id),
      flights: st.flights.filter((t) => t.tripId !== id),
      stays: st.stays.filter((t) => t.tripId !== id),
      activities: st.activities.filter((t) => t.tripId !== id),
      itinerary: st.itinerary.filter((t) => t.tripId !== id),
    }));
    persist(get, {}, del);
  },

  saveFlight(tripId, offer) {
    const now = new Date().toISOString();
    const f: SavedFlight = {
      id: uid(),
      tripId,
      legs: offer.legs,
      cabin: offer.cabin,
      passengers: offer.passengers,
      currency: offer.currency,
      priceSaved: offer.price,
      priceCurrent: offer.price,
      priceCheckedAt: now,
      bookingUrl: offer.bookingUrl,
      savedAt: now,
    };
    set((s) => ({ flights: [...s.flights, f] }));
    persist(get, { flights: [f] });
    return f;
  },

  removeFlight(id) {
    const items = get().itinerary.filter((i) => i.kind === "flight" && i.refId === id).map((i) => i.id);
    set((s) => ({ flights: s.flights.filter((f) => f.id !== id), itinerary: s.itinerary.filter((i) => !items.includes(i.id)) }));
    persist(get, {}, { flights: [id], itinerary: items });
  },

  saveStay(tripId, hotel, checkIn, checkOut) {
    const nights = Math.max(1, daysBetween(checkIn, checkOut));
    const total = Math.round(hotel.pricePerNight * nights);
    const now = new Date().toISOString();
    const st: SavedStay = {
      id: uid(),
      tripId,
      hotelId: hotel.id,
      name: hotel.name,
      area: hotel.area,
      city: hotel.city,
      lat: hotel.lat,
      lng: hotel.lng,
      checkIn,
      checkOut,
      currency: hotel.currency,
      priceSaved: total,
      priceCurrent: total,
      bookingUrl: hotel.bookingUrl,
      savedAt: now,
    };
    set((s) => ({ stays: [...s.stays, st] }));
    persist(get, { stays: [st] });
    return st;
  },

  removeStay(id) {
    const items = get().itinerary.filter((i) => i.kind === "stay" && i.refId === id).map((i) => i.id);
    set((s) => ({ stays: s.stays.filter((f) => f.id !== id), itinerary: s.itinerary.filter((i) => !items.includes(i.id)) }));
    persist(get, {}, { stays: [id], itinerary: items });
  },

  addActivity(tripId, a) {
    const act: SavedActivity = {
      id: uid(),
      tripId,
      name: a.name,
      category: a.category,
      lat: a.lat ?? null,
      lng: a.lng ?? null,
      notes: a.notes ?? "",
      savedAt: new Date().toISOString(),
    };
    set((s) => ({ activities: [...s.activities, act] }));
    persist(get, { activities: [act] });
    return act;
  },

  removeActivity(id) {
    const items = get().itinerary.filter((i) => i.kind === "activity" && i.refId === id).map((i) => i.id);
    set((s) => ({ activities: s.activities.filter((f) => f.id !== id), itinerary: s.itinerary.filter((i) => !items.includes(i.id)) }));
    persist(get, {}, { activities: [id], itinerary: items });
  },

  addToItinerary(tripId, day, kind, refId, index, time = null) {
    const items = dayItems(get().itinerary, tripId, day);
    const item: ItineraryItem = { id: uid(), tripId, day, position: 0, time, kind, refId };
    const at = index === undefined ? items.length : Math.max(0, Math.min(index, items.length));
    items.splice(at, 0, item);
    const updated = items.map((i, n) => ({ ...i, position: n }));
    const byId = new Map(updated.map((i) => [i.id, i]));
    set((s) => ({ itinerary: [...s.itinerary.filter((i) => !byId.has(i.id)), ...updated] }));
    persist(get, { itinerary: updated });
  },

  moveItineraryItem(id, day, index) {
    const all = get().itinerary;
    const item = all.find((i) => i.id === id);
    if (!item) return;
    const rest = all.filter((i) => i.id !== id);
    const source = dayItems(rest, item.tripId, item.day).map((i, n) => ({ ...i, position: n }));
    const target = item.day === day ? source : dayItems(rest, item.tripId, day);
    const at = Math.max(0, Math.min(index, target.length));
    target.splice(at, 0, { ...item, day });
    const updatedTarget = target.map((i, n) => ({ ...i, position: n }));
    const changed = item.day === day ? updatedTarget : [...source, ...updatedTarget];
    const byId = new Map(changed.map((i) => [i.id, i]));
    set((s) => ({ itinerary: s.itinerary.map((i) => byId.get(i.id) ?? i) }));
    persist(get, { itinerary: changed });
  },

  setItemTime(id, time) {
    set((s) => ({ itinerary: s.itinerary.map((i) => (i.id === id ? { ...i, time } : i)) }));
    const it = get().itinerary.find((i) => i.id === id);
    if (it) persist(get, { itinerary: [it] });
  },

  removeItineraryItem(id) {
    set((s) => ({ itinerary: s.itinerary.filter((i) => i.id !== id) }));
    persist(get, {}, { itinerary: [id] });
  },

  applyPrices(flightPrices, stayPrices, checkedAt) {
    const fp = new Map(flightPrices.filter((p) => p.price != null).map((p) => [p.id, p.price!]));
    const sp = new Map(stayPrices.filter((p) => p.price != null).map((p) => [p.id, p.price!]));
    set((s) => ({
      flights: s.flights.map((f) => (fp.has(f.id) ? { ...f, priceCurrent: fp.get(f.id)!, priceCheckedAt: checkedAt } : f)),
      stays: s.stays.map((st) => (sp.has(st.id) ? { ...st, priceCurrent: sp.get(st.id)! } : st)),
    }));
    const s = get();
    persist(get, {
      flights: s.flights.filter((f) => fp.has(f.id)),
      stays: s.stays.filter((st) => sp.has(st.id)),
    });
  },
}));

/** Itinerary items for a trip, grouped and ordered by day. */
export function itineraryByDay(items: ItineraryItem[], tripId: string): Record<string, ItineraryItem[]> {
  const out: Record<string, ItineraryItem[]> = {};
  for (const i of items) {
    if (i.tripId !== tripId) continue;
    (out[i.day] ??= []).push(i);
  }
  for (const d in out) out[d].sort((a, b) => a.position - b.position);
  return out;
}
