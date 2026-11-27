import type { ActivityCategory } from "../types";

/**
 * A photo you own or are licensed to use (your own, a press kit, or a creator's photo used
 * with permission). Put the file in /public/curated/… and reference it as "/curated/…".
 */
export interface CuratedImage {
  src: string;
  alt?: string;
  /** Shown under the photo in the place view, e.g. "@nycfoodie" or "Courtesy of Carbone". */
  credit?: string;
  creditUrl?: string;
}

/** A hand-picked place in a curated guide (food or things to do). */
export interface CuratedPlace {
  id: string;
  name: string;
  /** Two words max, e.g. "Fine dining", "Modern art". */
  tagline: string;
  neighbourhood: string;
  /** Finds the official Google Maps listing (photos) — name + area + city. */
  mapsQuery: string;
  lat: number;
  lng: number;
  /** Event category used when it's added to a trip. */
  category: ActivityCategory;
  /**
   * Curated photo choice: index into the Google listing's photos (picked with ?curate=1).
   * Unset = automatic (photos uploaded by the place itself first).
   */
  photo?: number;
  /** Curated write-up shown in the place view. */
  description?: string;
  /** 1–4 ($–$$$$). Google's price level is used when this isn't set. */
  priceLevel?: number;
  /** Where to book a table / tickets (shown in the place view's Info tab). */
  bookingUrl?: string;
  /** Curated social posts (Instagram post/Reel, TikTok, YouTube Short URLs). */
  social?: string[];
  /** Your own / licensed photos — shown first (card + carousel), before Google's. */
  images?: CuratedImage[];
  /** Admin-curated, ordered photo list (from data/curated-overrides.json); replaces the automatic photos. */
  photos?: ({ kind: "google"; name: string } | { kind: "url"; src: string })[];
}

export interface CuratedSection {
  id: string;
  title: string;
  places: CuratedPlace[];
}

export interface CuratedGuide {
  slug: string;
  city: string;
  country: string;
  /** Other names people search by. */
  aliases: string[];
  intro: string;
  sections: CuratedSection[];
}

export function placeFactory(city: string, category: ActivityCategory) {
  return (id: string, name: string, tagline: string, neighbourhood: string, lat: number, lng: number, cat: ActivityCategory = category): CuratedPlace => ({
    id,
    name,
    tagline,
    neighbourhood,
    mapsQuery: `${name}, ${neighbourhood}, ${city}`,
    lat,
    lng,
    category: cat,
  });
}

/** Add curated write-ups / price levels to a guide's places by id. */
export function withDetails(guide: CuratedGuide, details: Record<string, Partial<Pick<CuratedPlace, "description" | "priceLevel" | "social" | "photo" | "images" | "bookingUrl">>>): CuratedGuide {
  return {
    ...guide,
    sections: guide.sections.map((s) => ({ ...s, places: s.places.map((p) => ({ ...p, ...details[p.id] })) })),
  };
}

export function findGuide<T extends CuratedGuide>(guides: T[], slug: string | null | undefined) {
  return guides.find((g) => g.slug === slug);
}

/** Guides whose city, country or aliases match what's being typed. */
export function matchGuides<T extends CuratedGuide>(guides: T[], q: string): T[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  return guides.filter(
    (g) => g.city.toLowerCase().includes(s) || g.country.toLowerCase().includes(s) || g.aliases.some((a) => a.startsWith(s) || s.startsWith(a)),
  );
}

/** Every place across guides, to find the curated entry for something saved to a trip. */
export function findCuratedPlace<T extends CuratedGuide>(
  guides: { kind: "food" | "explore"; guides: T[] }[],
  name: string,
  destination?: string,
): { place: CuratedPlace; guide: T; kind: "food" | "explore" } | null {
  const n = name.trim().toLowerCase();
  const hits: { place: CuratedPlace; guide: T; kind: "food" | "explore" }[] = [];
  for (const { kind, guides: list } of guides)
    for (const guide of list) for (const s of guide.sections) for (const place of s.places) if (place.name.toLowerCase() === n) hits.push({ place, guide, kind });
  if (!hits.length) return null;
  // Prefer the guide for the trip's destination
  const d = destination?.trim().toLowerCase() ?? "";
  return hits.find((h) => d && (h.guide.city.toLowerCase().includes(d) || h.guide.aliases.some((a) => d.includes(a) || a.includes(d)))) ?? hits[0];
}
