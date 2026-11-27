import { NextResponse } from "next/server";
import { hashKey, readShare, validToken, writeShare } from "@/lib/share-server";

export const dynamic = "force-dynamic";

/** The latest shared snapshot of an itinerary (read-only, anyone with the link). */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!validToken(token)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  try {
    const rec = await readShare(token);
    if (!rec) return NextResponse.json({ error: "This itinerary isn't shared (or the link is wrong)." }, { status: 404 });
    return NextResponse.json({ data: rec.data, updatedAt: rec.updatedAt }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[share]", e);
    return NextResponse.json({ error: "Couldn't load this itinerary." }, { status: 500 });
  }
}

/** Publish the latest snapshot. Body: { key, data }. The first publish sets the key; later ones must match it. */
export async function PUT(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!validToken(token)) return NextResponse.json({ error: "Bad token." }, { status: 400 });
  const raw = await req.text();
  if (raw.length > 1_000_000) return NextResponse.json({ error: "Itinerary too large." }, { status: 413 });
  let body: { key?: unknown; data?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad JSON." }, { status: 400 });
  }
  if (typeof body.key !== "string" || body.key.length < 16 || !body.data || typeof body.data !== "object") {
    return NextResponse.json({ error: "Missing key or data." }, { status: 400 });
  }
  try {
    const keyHash = hashKey(body.key);
    const existing = await readShare(token);
    if (existing && existing.keyHash !== keyHash) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
    await writeShare(token, { data: body.data, keyHash, updatedAt: new Date().toISOString() });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[share]", e);
    return NextResponse.json({ error: "Couldn't save the shared itinerary." }, { status: 500 });
  }
}
