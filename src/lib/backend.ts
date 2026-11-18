import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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

function supabaseBackend(client: SupabaseClient): Backend {
  return {
    kind: "supabase",
    async load() {
      const entries = await Promise.all(
        (Object.entries(TABLE_FOR) as [keyof TripData, Table][]).map(async ([key, table]) => {
          const { data, error } = await client.from(table).select("*");
          if (error) throw new Error(`${table}: ${error.message}`);
          return [key, (data ?? []).map((r) => mapKeys(r, camel))] as const;
        }),
      );
      return Object.fromEntries(entries) as unknown as TripData;
    },
    async upsert(table, rows) {
      if (!rows.length) return;
      const { error } = await client.from(table).upsert(rows.map((r) => mapKeys(r, snake)));
      if (error) console.error(`Supabase upsert ${table}:`, error.message);
    },
    async remove(table, ids) {
      if (!ids.length) return;
      const { error } = await client.from(table).delete().in("id", ids);
      if (error) console.error(`Supabase delete ${table}:`, error.message);
    },
  };
}

export function getBackend(): Backend {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) return supabaseBackend(createClient(url, key));
  return localBackend;
}
