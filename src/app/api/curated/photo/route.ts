import { NextResponse } from "next/server";

/**
 * A photo from a place's official Google Maps listing (Places API, New) for curated guides.
 * Needs GOOGLE_MAPS_API_KEY (server-only); without it responds 404 and the UI shows a placeholder.
 *
 * - `index=n`: that photo of the listing (a curator's pick, chosen with ?curate=1).
 * - no index: automatic — photos uploaded by the business itself first (usually food/interior
 *   shots rather than customers' street photos), landscape over portrait.
 *
 * Returns { url, index, count, attribution }. Google requires showing the photo's author,
 * which the card does under the name. Place IDs may be kept indefinitely; photo URLs are
 * fetched fresh.
 */
export async function GET(req: Request) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return NextResponse.json({ error: "Photos need GOOGLE_MAPS_API_KEY." }, { status: 404 });
  const params = new URL(req.url).searchParams;
  const q = (params.get("q") ?? "").trim().slice(0, 200);
  const width = Math.min(1600, Math.max(200, Number(params.get("w")) || 800));
  const wanted = params.get("index");
  if (!q) return NextResponse.json({ error: "Missing q." }, { status: 400 });

  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.id,places.displayName,places.photos",
      },
      body: JSON.stringify({ textQuery: q, pageSize: 1 }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Places search ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const place = (await res.json()).places?.[0];
    const photos: Photo[] = place?.photos ?? [];
    if (!photos.length) return NextResponse.json({ error: "No photos for this place." }, { status: 404 });

    const index = wanted != null && wanted !== "" ? Math.min(photos.length - 1, Math.max(0, Number(wanted) || 0)) : autoPick(photos, place.displayName?.text ?? "");
    const photo = photos[index];
    const media = await fetch(`https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=${width}&skipHttpRedirect=true&key=${key}`, {
      cache: "no-store",
    });
    if (!media.ok) throw new Error(`Places photo ${media.status}`);
    const { photoUri } = await media.json();
    const author = photo.authorAttributions?.[0];
    return NextResponse.json(
      { url: photoUri, index, count: photos.length, attribution: author ? { name: author.displayName, uri: author.uri } : null },
      { headers: { "Cache-Control": "private, max-age=3600" } },
    );
  } catch (e) {
    console.error("[curated/photo]", e);
    return NextResponse.json({ error: "Photo lookup failed." }, { status: 502 });
  }
}

interface Photo {
  name: string;
  widthPx?: number;
  heightPx?: number;
  authorAttributions?: { displayName: string; uri?: string }[];
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Best default photo: the business's own uploads first, then landscape, then Google's order. */
function autoPick(photos: Photo[], placeName: string): number {
  const name = norm(placeName);
  let best = 0;
  let bestScore = -Infinity;
  photos.forEach((ph, i) => {
    const author = norm(ph.authorAttributions?.[0]?.displayName ?? "");
    const byOwner = !!name && !!author && (author.includes(name) || name.includes(author));
    const landscape = (ph.widthPx ?? 0) >= (ph.heightPx ?? 0);
    const score = (byOwner ? 3 : 0) + (landscape ? 1 : 0) - i * 0.01;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return best;
}
