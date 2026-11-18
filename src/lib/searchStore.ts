"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Cabin, FlightOffer, Hotel, Place } from "./types";

export type HourRange = [number, number];
export const FULL_DAY: HourRange = [0, 24];

export type FlightSort = "price" | "depart" | "arrive" | "duration";

export interface FlightSession {
  from: Place | null;
  to: Place | null;
  depart: string;
  ret: string;
  adults: number;
  cabin: Cabin;
  offers: FlightOffer[] | null;
  source: string;
  // post-search filters
  price: [number, number] | null;
  stops: "any" | "0" | "1";
  airlines: string[];
  outDepart: HourRange;
  outArrive: HourRange;
  backDepart: HourRange;
  backArrive: HourRange;
  sort: FlightSort;
  /** Return options loaded per round-trip outbound offer id (Google Flights two-step search). */
  returns?: Record<string, FlightOffer[]>;
  /** Trip id the form was last prefilled from (so returning to the page doesn't re-prefill). */
  prefilledFor: string | null;
}

export interface StaySession {
  q: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  hotels: Hotel[] | null;
  price: [number, number] | null;
  amenities: string[];
  minStars: number;
  prefilledFor: string | null;
}

interface SearchState {
  flight: FlightSession | null;
  stay: StaySession | null;
  setFlight(patch: Partial<FlightSession>, init: FlightSession): void;
  setStay(patch: Partial<StaySession>, init: StaySession): void;
}

/**
 * Flight and stay search state that survives moving between pages (kept in memory,
 * and in sessionStorage so a refresh within the tab keeps it too).
 */
/** sessionStorage that never throws (quota exceeded, private mode, blocked storage). */
const safeSessionStorage = {
  getItem: (k: string) => {
    try {
      return sessionStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k: string, v: string) => {
    try {
      sessionStorage.setItem(k, v);
    } catch {
      /* not critical: state is still kept in memory */
    }
  },
  removeItem: (k: string) => {
    try {
      sessionStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  },
};

export const useSearchStore = create<SearchState>()(
  persist(
    (set) => ({
      flight: null,
      stay: null,
      setFlight: (patch, init) => set((s) => ({ flight: { ...(s.flight ?? init), ...patch } })),
      setStay: (patch, init) => set((s) => ({ stay: { ...(s.stay ?? init), ...patch } })),
    }),
    {
      name: "travel-bug:search",
      storage: createJSONStorage(() => safeSessionStorage),
      // Only the form and filters go to sessionStorage. Results (which can be several MB with
      // live seller links) stay in memory: they survive page changes, not a full reload.
      partialize: (s) => ({
        flight: s.flight && { ...s.flight, offers: null, returns: {}, source: "" },
        stay: s.stay && { ...s.stay, hotels: null },
      }),
      skipHydration: true, // rehydrated on mount by StoreProvider to avoid SSR mismatches
    },
  ),
);
