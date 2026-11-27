import "server-only";
import { NextResponse } from "next/server";
import { supabaseEnabled } from "./supabase/env";
import { currentUser } from "./supabase/server";

/**
 * Routes that spend paid API credits (live flight/hotel searches, price checks): with accounts
 * switched on, only signed-in users may call them, and each user gets a generous rolling limit
 * so a runaway script can't burn through credits. Returns a response to send back, or null to go ahead.
 */
const WINDOW_MS = 10 * 60_000;
const LIMIT = Number(process.env.PAID_REQUESTS_PER_10_MIN ?? 60);
const g = globalThis as unknown as { __paidHits?: Map<string, number[]> };
const hits = (g.__paidHits ??= new Map());

export async function guardPaid(): Promise<NextResponse | null> {
  if (!supabaseEnabled) return null;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Log in to search." }, { status: 401 });
  const now = Date.now();
  const recent = (hits.get(user.id) ?? []).filter((t: number) => now - t < WINDOW_MS);
  if (recent.length >= LIMIT) {
    return NextResponse.json({ error: "You've searched a lot in the last few minutes — try again shortly." }, { status: 429 });
  }
  recent.push(now);
  hits.set(user.id, recent);
  return null;
}
