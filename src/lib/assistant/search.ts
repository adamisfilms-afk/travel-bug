import "server-only";

import { CITY_GUIDES, kindOfPlace, matchCityGuides, type CityGuide } from "@/lib/curated/city-guides";
import type { PlaceOverride } from "@/lib/curated/overrides";
import { readOverrides } from "@/lib/curated/overrides-server";
import type { CuratedPlace } from "@/lib/curated/types";

/**
 * Retrieval for the trip assistant. Plain code, no AI: the curated City Guides are searched
 * first, every time; general suggestions from Google are only looked up when the guides have
 * fewer than MIN_CURATED matches.
 */

export type PlaceKind = "food" | "explore" | "stay";

export interface SearchQuery {
  city: string;
  kind: PlaceKind | "any";
  area: string | null;
  maxPrice: number | null;
  tags: string[];
  keywords: string[];
}

export interface Candidate {
  /** Curated place id, or "g:<Google id>". */
  id: string;
  source: "curated" | "general";
  name: string;
  tagline: string;
  area: string;
  section: string;
  kind: PlaceKind;
  price: number | null;
  /** What the model may base its summary on. */
  about: string;
  lat: number | null;
  lng: number | null;
  category: string;
  guide?: string;
  mapsQuery?: string;
  rating?: number | null;
}

/** Fewer curated matches than this → top up with general suggestions. */
export const MIN_CURATED = 3;
/** At most this many candidates are sent to the model (keeps cost down). */
const MAX_CANDIDATES = 15;

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/** An admin's edits over a place (the same fields the guides show; overrides.ts is client-only). */
function applyOverride(p: CuratedPlace, o: PlaceOverride | undefined): CuratedPlace {
  if (!o) return p;
  return {
    ...p,
    ...(o.name ? { name: o.name } : {}),
    ...(o.tagline != null ? { tagline: o.tagline } : {}),
    ...(o.neighbourhood ? { neighbourhood: o.neighbourhood } : {}),
    ...(o.description != null ? { description: o.description } : {}),
    ...(o.priceLevel !== undefined ? { priceLevel: o.priceLevel ?? undefined } : {}),
  };
}

export function guideFor(city: string): CityGuide | null {
  return matchCityGuides(city)[0] ?? null;
}

function kindOf(g: CityGuide, p: CuratedPlace, section: string): PlaceKind {
  if (/stay|hotel/i.test(section)) return "stay";
  return kindOfPlace(g, p);
}

/** Words that say nothing about a place ("best", "good"…), ignored when matching keywords. */
const STOP = new Set(["best", "good", "great", "nice", "place", "places", "spot", "spots", "some", "the", "for", "with", "and", "near", "around", "top"]);

/** Search one city's curated guide. Hard filters: city and kind. Then score by area, price, tags and keywords. */
export async function searchCurated(q: SearchQuery): Promise<{ guide: CityGuide | null; results: Candidate[] }> {
  const guide = guideFor(q.city);
  if (!guide) return { guide: null, results: [] };
  let overrides: Record<string, PlaceOverride> = {};
  try {
    overrides = (await readOverrides()) as Record<string, PlaceOverride>;
  } catch {
    /* edits unavailable: use the guide as written */
  }

  const split = (list: string[]) => list.flatMap((k) => norm(k).split(/[^a-z0-9]+/)).filter((w) => w.length > 2 && !STOP.has(w));
  // Keywords ("schnitzel", "rooftop") must match; tags ("kids", "romantic") only lift places up the list,
  // since most places aren't tagged yet and the model can judge fit from the write-ups.
  const words = split(q.keywords);
  const tagWords = split(q.tags);
  const tags = q.tags.map(norm);
  const area = q.area ? norm(q.area) : null;

  const scored: { c: Candidate; score: number; matched: boolean; order: number }[] = [];
  let order = 0;
  for (const s of guide.sections) {
    for (const raw of s.places) {
      order++;
      const o = overrides[raw.id];
      if (o?.hidden) continue;
      const p = applyOverride(raw, o);
      const kind = kindOf(guide, raw, s.title);
      if (q.kind !== "any" && kind !== q.kind) continue;

      const hay = norm([p.name, p.tagline, s.title, p.neighbourhood, p.description ?? "", ...(p.tags ?? [])].join(" "));
      let score = 0;
      if (area && (norm(p.neighbourhood).includes(area) || area.includes(norm(p.neighbourhood)))) score += 3;
      if (q.maxPrice != null && p.priceLevel != null) score += p.priceLevel <= q.maxPrice ? 2 : -3;
      for (const t of tags) if ((p.tags ?? []).some((x) => norm(x) === t)) score += 2;
      for (const w of words) if (hay.includes(w)) score += 1;
      const lift = tagWords.filter((w) => hay.includes(w)).length * 0.5;
      if (p.description) score += 0.5; // a write-up gives a better summary

      scored.push({
        score: score + lift,
        matched: score >= 1,
        order,
        c: {
          id: p.id,
          source: "curated",
          name: p.name,
          tagline: p.tagline,
          area: p.neighbourhood,
          section: s.title,
          kind,
          price: p.priceLevel ?? null,
          about: (p.description ?? "").slice(0, 320),
          lat: p.lat,
          lng: p.lng,
          category: p.category,
          guide: guide.slug,
          mapsQuery: p.mapsQuery,
        },
      });
    }
  }
  // When the request names things (keywords, tags, area), keep only places that match at least one;
  // a plain "restaurants in Vienna" keeps the whole kind, in guide order.
  const specific = words.length > 0 || !!area;
  const kept = specific ? scored.filter((x) => x.matched) : scored;
  kept.sort((a, b) => b.score - a.score || a.order - b.order);
  return { guide, results: kept.slice(0, MAX_CANDIDATES).map((x) => x.c) };
}

const PRICE: Record<string, number> = {
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

/** General suggestions from Google Places (Text Search, New). Needs GOOGLE_MAPS_API_KEY; [] without it. */
export async function searchGeneral(q: SearchQuery, limit: number): Promise<Candidate[]> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key || limit <= 0) return [];
  const what = q.kind === "stay" ? "hotels" : q.kind === "food" ? "restaurants" : q.kind === "explore" ? "things to do" : "places";
  const text = [q.keywords.join(" "), q.tags.join(" "), what, q.area ? `in ${q.area}` : "", q.city].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location,places.priceLevel,places.rating,places.userRatingCount,places.editorialSummary,places.primaryTypeDisplayName,places.shortFormattedAddress",
      },
      body: JSON.stringify({ textQuery: text, pageSize: Math.min(10, limit + 3), languageCode: "en" }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Places ${res.status}`);
    type P = {
      id: string;
      displayName?: { text: string };
      formattedAddress?: string;
      shortFormattedAddress?: string;
      location?: { latitude: number; longitude: number };
      priceLevel?: string;
      rating?: number;
      userRatingCount?: number;
      editorialSummary?: { text: string };
      primaryTypeDisplayName?: { text: string };
    };
    const places: P[] = (await res.json()).places ?? [];
    return places
      .filter((p) => p.displayName?.text && (p.userRatingCount ?? 0) >= 20) // skip barely-reviewed listings
      .slice(0, limit)
      .map((p) => {
        const name = p.displayName!.text;
        const type = p.primaryTypeDisplayName?.text ?? (q.kind === "stay" ? "Hotel" : "");
        return {
          id: `g:${p.id}`,
          source: "general" as const,
          name,
          tagline: type,
          area: (p.shortFormattedAddress ?? p.formattedAddress ?? "").split(",").slice(-2, -1)[0]?.trim() ?? "",
          section: type,
          kind: q.kind === "any" ? "explore" : q.kind,
          price: p.priceLevel ? PRICE[p.priceLevel] ?? null : null,
          about: [p.editorialSummary?.text, p.rating ? `Google rating ${p.rating} (${p.userRatingCount} reviews)` : ""].filter(Boolean).join(". "),
          lat: p.location?.latitude ?? null,
          lng: p.location?.longitude ?? null,
          category: q.kind === "food" ? "food" : q.kind === "stay" ? "other" : "sight",
          mapsQuery: `${name} ${p.formattedAddress ?? q.city}`,
          rating: p.rating ?? null,
        };
      });
  } catch (e) {
    console.error("[assistant] general search", e);
    return [];
  }
}

/** City names we have curated guides for (told to the model so it knows what's covered). */
export const CURATED_CITIES = CITY_GUIDES.map((g) => g.city);
