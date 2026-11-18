import { NextResponse } from "next/server";

/** Resolves a Places photo reference ("places/…/photos/…") to an image URL. Needs GOOGLE_MAPS_API_KEY. */
export async function GET(req: Request) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return NextResponse.json({ error: "Photos need GOOGLE_MAPS_API_KEY." }, { status: 404 });
  const params = new URL(req.url).searchParams;
  const name = params.get("name") ?? "";
  const width = Math.min(2400, Math.max(200, Number(params.get("w")) || 1600));
  if (!/^places\/[\w-]+\/photos\/[\w-]+$/.test(name)) return NextResponse.json({ error: "Bad photo reference." }, { status: 400 });
  try {
    const res = await fetch(`https://places.googleapis.com/v1/${name}/media?maxWidthPx=${width}&skipHttpRedirect=true&key=${key}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Places photo ${res.status}`);
    const { photoUri } = await res.json();
    return NextResponse.json({ url: photoUri }, { headers: { "Cache-Control": "private, max-age=3600" } });
  } catch (e) {
    console.error("[curated/media]", e);
    return NextResponse.json({ error: "Photo lookup failed." }, { status: 502 });
  }
}
