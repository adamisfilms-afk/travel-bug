import { NextResponse } from "next/server";

/**
 * Main photo of a place's official Google Maps listing (Places API, New).
 * Needs GOOGLE_MAPS_API_KEY (server-only). Without it, responds 404 and the UI shows a placeholder.
 *
 * Google requires showing the photo's author attribution, so this returns JSON
 * ({ url, attribution }) rather than redirecting to the image.
 * Place IDs may be stored indefinitely under Google's terms, so they're kept in memory;
 * photo URLs are fetched fresh each time.
 */

const placeIds = new Map<string, string | null>();

export async function GET(req: Request) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return NextResponse.json({ error: "Photos need GOOGLE_MAPS_API_KEY." }, { status: 404 });
  const params = new URL(req.url).searchParams;
  const q = (params.get("q") ?? "").trim().slice(0, 200);
  const width = Math.min(1600, Math.max(200, Number(params.get("w")) || 800));
  if (!q) return NextResponse.json({ error: "Missing q." }, { status: 400 });

  try {
    // 1. Find the listing (place ID + its photos)
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.id,places.photos",
      },
      body: JSON.stringify({ textQuery: q, pageSize: 1 }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Places search ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    const p = data.places?.[0];
    placeIds.set(q, p?.id ?? null);
    const photo = p?.photos?.[0];
    if (!photo?.name) return NextResponse.json({ error: "No photo for this place." }, { status: 404 });

    // 2. Resolve the photo to a short-lived image URL
    const media = await fetch(
      `https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=${width}&skipHttpRedirect=true&key=${key}`,
      { cache: "no-store" },
    );
    if (!media.ok) throw new Error(`Places photo ${media.status}`);
    const { photoUri } = await media.json();
    const author = photo.authorAttributions?.[0];
    return NextResponse.json(
      { url: photoUri, placeId: p.id, attribution: author ? { name: author.displayName, uri: author.uri } : null },
      { headers: { "Cache-Control": "private, max-age=3600" } },
    );
  } catch (e) {
    console.error("[food/photo]", e);
    return NextResponse.json({ error: "Photo lookup failed." }, { status: 502 });
  }
}
