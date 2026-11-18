import type { ActivityCategory } from "../types";

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
