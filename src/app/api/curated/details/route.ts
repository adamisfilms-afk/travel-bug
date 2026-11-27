import { NextResponse } from "next/server";

/**
 * Google details for a curated place's view (Places API, New): rating, review count,
 * up to 5 reviews, Google's AI review summary (where available), price level, opening
 * hours, links, and the listing's photo references (resolved via /api/curated/media).
 * Needs GOOGLE_MAPS_API_KEY; without it responds 404 and the view explains.
 *
 * Display rules followed in the UI: reviews show the author and link to Google Maps;
 * the AI summary shows "Summarized with Gemini" and links to the reviews.
 */

const FIELDS = [
  "id",
  "displayName",
  "formattedAddress",
  "rating",
  "userRatingCount",
  "priceLevel",
  "reviews",
  "reviewSummary",
  "googleMapsUri",
  "websiteUri",
  "regularOpeningHours.weekdayDescriptions",
  "photos",
].map((f) => `places.${f}`);

const PRICE: Record<string, number> = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

export async function GET(req: Request) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return NextResponse.json({ error: "Google details need GOOGLE_MAPS_API_KEY." }, { status: 404 });
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 200);
  if (!q) return NextResponse.json({ error: "Missing q." }, { status: 400 });

  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": FIELDS.join(",") },
      body: JSON.stringify({ textQuery: q, pageSize: 1, languageCode: "en" }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Places ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const p = (await res.json()).places?.[0];
    if (!p) return NextResponse.json({ error: "Not found on Google." }, { status: 404 });

    type Review = {
      rating?: number;
      relativePublishTimeDescription?: string;
      text?: { text?: string };
      originalText?: { text?: string };
      authorAttribution?: { displayName?: string; uri?: string; photoUri?: string };
      googleMapsUri?: string;
    };
    return NextResponse.json(
      {
        placeId: p.id,
        name: p.displayName?.text,
        address: p.formattedAddress,
        rating: p.rating ?? null,
        ratingCount: p.userRatingCount ?? null,
        priceLevel: p.priceLevel != null ? PRICE[p.priceLevel] ?? null : null,
        mapsUrl: p.googleMapsUri ?? null,
        website: p.websiteUri ?? null,
        hours: p.regularOpeningHours?.weekdayDescriptions ?? null,
        summary: p.reviewSummary?.text?.text
          ? {
              text: p.reviewSummary.text.text,
              disclosure: p.reviewSummary.disclosureText?.text ?? "Summarized with Gemini",
              reviewsUrl: p.reviewSummary.reviewsUri ?? p.googleMapsUri ?? null,
              flagUrl: p.reviewSummary.flagContentUri ?? null,
            }
          : null,
        reviews: ((p.reviews ?? []) as Review[]).map((r) => ({
          rating: r.rating ?? null,
          when: r.relativePublishTimeDescription ?? "",
          text: r.text?.text ?? r.originalText?.text ?? "",
          author: r.authorAttribution?.displayName ?? "Google user",
          authorUrl: r.authorAttribution?.uri ?? null,
          authorPhoto: r.authorAttribution?.photoUri ?? null,
          url: r.googleMapsUri ?? null,
        })),
        photos: ((p.photos ?? []) as { name: string; widthPx?: number; heightPx?: number; authorAttributions?: { displayName?: string; uri?: string }[] }[])
          .slice(0, 10)
          .map((ph) => ({ name: ph.name, author: ph.authorAttributions?.[0]?.displayName ?? null, authorUrl: ph.authorAttributions?.[0]?.uri ?? null })),
      },
      { headers: { "Cache-Control": "private, max-age=3600" } },
    );
  } catch (e) {
    console.error("[curated/details]", e);
    return NextResponse.json({ error: "Couldn't load Google details.", detail: e instanceof Error ? e.message.replace(/key=[^&\s]+/g, "key=…") : String(e) }, { status: 502 });
  }
}
