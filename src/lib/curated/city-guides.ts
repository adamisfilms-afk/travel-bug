/**
 * City guides: a city's curated food and things-to-do guides shown together on one page.
 */
import { EXPLORE_GUIDES } from "../explore/guides";
import { FOOD_GUIDES } from "../food/guides";
import { matchGuides as match, type CuratedGuide, type CuratedPlace } from "./types";

export type GuideKind = "food" | "explore";

export interface CityGuide extends CuratedGuide {
  /** Which guide (food or explore) each place comes from. */
  kindOf: Record<string, GuideKind>;
}

function combine(): CityGuide[] {
  const bySlug = new Map<string, CityGuide>();
  const add = (g: CuratedGuide, kind: GuideKind) => {
    const cur = bySlug.get(g.slug) ?? { ...g, aliases: [], sections: [], kindOf: {} };
    cur.aliases = [...new Set([...cur.aliases, ...g.aliases])];
    cur.sections = [...cur.sections, ...g.sections.map((s) => ({ ...s, id: `${kind}-${s.id}` }))];
    for (const s of g.sections) for (const p of s.places) cur.kindOf[p.id] = kind;
    bySlug.set(g.slug, cur);
  };
  FOOD_GUIDES.forEach((g) => add(g, "food"));
  EXPLORE_GUIDES.forEach((g) => add(g, "explore"));
  return [...bySlug.values()];
}

export const CITY_GUIDES: CityGuide[] = combine();

export const cityGuideBySlug = (slug: string | null | undefined) => CITY_GUIDES.find((g) => g.slug === slug);
export const matchCityGuides = (q: string) => match(CITY_GUIDES, q);
export const kindOfPlace = (g: CityGuide, p: CuratedPlace): GuideKind => g.kindOf[p.id] ?? "food";
