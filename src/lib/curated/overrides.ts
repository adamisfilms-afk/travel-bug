"use client";

import { useEffect } from "react";
import { create } from "zustand";
import type { CuratedPlace } from "./types";

/**
 * Admin edits to curated places (content and photos), saved to data/curated-overrides.json
 * through /api/curated/overrides and layered over the guide data everywhere places are shown.
 * Commit that file (and public/curated/uploads/) to publish the edits.
 */

/** A photo in a place's curated, ordered photo list. */
export type PhotoItem =
  | { kind: "google"; name: string } // from the place's Google Maps listing ("places/…/photos/…")
  | { kind: "url"; src: string }; // a link, or an upload saved under /curated/uploads/

export interface PlaceOverride {
  name?: string;
  tagline?: string;
  neighbourhood?: string;
  description?: string;
  /** 1–4; null = use Google's. */
  priceLevel?: number | null;
  social?: string[];
  /** Replaces the automatic photos (own images + Google's) when set. */
  photos?: PhotoItem[];
}

/** Admin tools are on in local development, or with NEXT_PUBLIC_ADMIN=1. */
export const IS_ADMIN = process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_ADMIN === "1";

interface OverridesState {
  overrides: Record<string, PlaceOverride>;
  loaded: boolean;
  load: () => void;
  save: (id: string, override: PlaceOverride) => Promise<void>;
}

let loading = false;

export const useOverrides = create<OverridesState>((set, get) => ({
  overrides: {},
  loaded: false,
  load: () => {
    if (get().loaded || loading) return;
    loading = true;
    fetch("/api/curated/overrides")
      .then((r) => (r.ok ? r.json() : {}))
      .then((o) => set({ overrides: o ?? {}, loaded: true }))
      .catch(() => set({ loaded: true }))
      .finally(() => (loading = false));
  },
  save: async (id, override) => {
    const res = await fetch("/api/curated/overrides", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, override }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error ?? `Save failed (${res.status})`);
    set({ overrides: data });
  },
}));

export function applyOverride(place: CuratedPlace, o: PlaceOverride | undefined): CuratedPlace {
  if (!o) return place;
  return {
    ...place,
    ...(o.name ? { name: o.name } : {}),
    ...(o.tagline != null ? { tagline: o.tagline } : {}),
    ...(o.neighbourhood ? { neighbourhood: o.neighbourhood } : {}),
    ...(o.description != null ? { description: o.description } : {}),
    ...(o.priceLevel !== undefined ? { priceLevel: o.priceLevel ?? undefined } : {}),
    ...(o.social ? { social: o.social } : {}),
    ...(o.photos ? { photos: o.photos } : {}),
  };
}

/** The place with any admin edits applied (loads the edits once per session). */
export function useCuratedPlace(place: CuratedPlace): CuratedPlace {
  const o = useOverrides((s) => s.overrides[place.id]);
  const load = useOverrides((s) => s.load);
  useEffect(load, [load]);
  return applyOverride(place, o);
}
