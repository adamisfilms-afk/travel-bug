import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseBrowser } from "./supabase/client";
import type { TripData } from "./types";

export type Table = "trips" | "saved_flights" | "saved_stays" | "saved_activities" | "itinerary_items";

export const TABLE_FOR: Record<keyof TripData, Table> = {
  trips: "trips",
  flights: "saved_flights",
  stays: "saved_stays",
  activities: "saved_activities",
  itinerary: "itinerary_items",
};

export interface Backend {
  kind: "local" | "supabase";
  /** Supabase only: the signed-in user's id (null when signed out). */
  userId?: string | null;
  load(): Promise<TripData | null>;
  /** Called with the full state after every change (local snapshotting). */
  snapshot?(data: TripData): void;
  upsert?(table: Table, rows: object[]): Promise<void>;
  remove?(table: Table, ids: string[]): Promise<void>;
}

// --- localStorage ----------------------------------------------------------

const KEY = "travel-bug:v1";

const localBackend: Backend = {
  kind: "local",
  async load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as TripData) : null;
    } catch {
      return null;
    }
  },
  snapshot(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* storage full or blocked; state stays in memory */
    }
  },
};

// --- Supabase --------------------------------------------------------------

const snake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const camel = (s: string) => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

function mapKeys(obj: object, fn: (k: string) => string) {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [fn(k), v]));
}

/** Columns the database doesn't have (kept out of upserts). */
const LOCAL_ONLY = new Set(["userId"]);

function supabaseBackend(client: SupabaseClient): Backend {
  return {
    kind: "supabase",
    userId: null,
    async load() {
      const { data: auth } = await client.auth.getUser();
      this.userId = auth.user?.id ?? null;
      if (!this.userId) return null; // signed out: nothing to load
      const entries = await Promise.all(
        (Object.entries(TABLE_FOR) as [keyof TripData, Table][]).map(async ([key, table]) => {
          const { data, error } = await client.from(table).select("*");
          if (error) throw new Error(`${table}: ${error.message}`);
          return [key, (data ?? []).map((r) => { const o = mapKeys(r, camel) as Record<string, unknown>; delete o.userId; return o; })] as const;
        }),
      );
      return Object.fromEntries(entries) as unknown as TripData;
    },
    async upsert(table, rows) {
      if (!rows.length) return;
      const clean = rows.map((r) => mapKeys(Object.fromEntries(Object.entries(r).filter(([k]) => !LOCAL_ONLY.has(k))), snake));
      const { error } = await client.from(table).upsert(clean);
      if (error) throw new Error(`${table}: ${error.message}`);
    },
    async remove(table, ids) {
      if (!ids.length) return;
      const { error } = await client.from(table).delete().in("id", ids);
      if (error) throw new Error(`${table}: ${error.message}`);
    },
  };
}

export function getBackend(): Backend {
  const client = supabaseBrowser();
  return client ? supabaseBackend(client) : localBackend;
}

/**
 * Trips saved in this browser before accounts existed (localStorage), with fresh ids so they
 * can't clash with anyone else's rows. Returns null if there's nothing to import or it was done.
 */
export function localTripsToImport(): TripData | null {
  try {
    if (localStorage.getItem(`${KEY}:imported`)) return null;
    const raw = localStorage.getItem(KEY);
    const d = raw ? (JSON.parse(raw) as TripData) : null;
    if (!d?.trips?.length) return null;
    const ids = new Map<string, string>();
    const id = (old: string) => ids.get(old) ?? (ids.set(old, crypto.randomUUID()), ids.get(old)!);
    const trips = d.trips.map((t) => ({ ...t, id: id(t.id), shareId: undefined, shareKey: undefined }));
    const flights = (d.flights ?? []).map((x) => ({ ...x, id: id(x.id), tripId: id(x.tripId) }));
    const stays = (d.stays ?? []).map((x) => ({ ...x, id: id(x.id), tripId: id(x.tripId) }));
    const activities = (d.activities ?? []).map((x) => ({ ...x, id: id(x.id), tripId: id(x.tripId) }));
    const itinerary = (d.itinerary ?? []).map((x) => ({ ...x, id: id(x.id), tripId: id(x.tripId), refId: id(x.refId) }));
    return { trips, flights, stays, activities, itinerary };
  } catch {
    return null;
  }
}

export function markLocalImported() {
  try {
    localStorage.setItem(`${KEY}:imported`, new Date().toISOString());
  } catch {
    /* ignore */
  }
}
