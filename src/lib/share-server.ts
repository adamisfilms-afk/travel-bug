import "server-only";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

/**
 * Shared itineraries: the latest snapshot of a trip that its owner has shared, by share token.
 * Stored in Supabase (table shared_itineraries) when it's configured, otherwise in
 * data/shares/<token>.json — fine locally, but a hosted site needs Supabase for links to work.
 * Only someone holding the trip's share key (kept with the trip) can update a snapshot.
 */

export interface ShareRecord {
  data: unknown;
  keyHash: string;
  updatedAt: string;
}

const DIR = path.join(process.cwd(), "data", "shares");
export const validToken = (t: string) => /^[A-Za-z0-9_-]{8,64}$/.test(t);
export const hashKey = (k: string) => createHash("sha256").update(k).digest("hex");

function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}

export async function readShare(token: string): Promise<ShareRecord | null> {
  const db = supabase();
  if (db) {
    const { data, error } = await db.from("shared_itineraries").select("data, key_hash, updated_at").eq("token", token).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? { data: data.data, keyHash: data.key_hash, updatedAt: data.updated_at } : null;
  }
  try {
    return JSON.parse(await fs.readFile(path.join(DIR, `${token}.json`), "utf8"));
  } catch {
    return null;
  }
}

export async function writeShare(token: string, rec: ShareRecord): Promise<void> {
  const db = supabase();
  if (db) {
    const { error } = await db
      .from("shared_itineraries")
      .upsert({ token, data: rec.data, key_hash: rec.keyHash, updated_at: rec.updatedAt });
    if (error) throw new Error(error.message);
    return;
  }
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(path.join(DIR, `${token}.json`), JSON.stringify(rec));
}
