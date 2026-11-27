"use client";

import { useEffect, useState } from "react";
import type { CuratedPlace } from "./types";

/** Photo URLs already resolved this session, by place id. */
const cache = new Map<string, string | null>();
const inflight = new Map<string, Promise<string | null>>();

function resolve(place: CuratedPlace, width: number): Promise<string | null> {
  const cover = place.photos?.[0];
  if (cover?.kind === "url") return Promise.resolve(cover.src);
  if (!cover && place.images?.[0]) return Promise.resolve(place.images[0].src);
  const url = cover
    ? `/api/curated/media?name=${encodeURIComponent(cover.name)}&w=${width}`
    : `/api/curated/photo?${new URLSearchParams({ q: place.mapsQuery, w: String(width), ...(place.photo != null ? { index: String(place.photo) } : {}) })}`;
  return fetch(url)
    .then((r) => (r.ok ? r.json() : null))
    .then((d: { url?: string } | null) => d?.url ?? null)
    .catch(() => null);
}

/** The cover photo of a curated place (admin cover, own photo, or its Google pick); null while loading or if none. */
export function useCuratedCover(place: CuratedPlace | null | undefined, width = 800): string | null {
  const key = place ? `${place.id}|${place.photos?.[0] ? JSON.stringify(place.photos[0]) : place.photo ?? "auto"}` : "";
  const [url, setUrl] = useState<string | null>(() => (key ? cache.get(key) ?? null : null));
  useEffect(() => {
    if (!place) return setUrl(null);
    if (cache.has(key)) return setUrl(cache.get(key)!);
    let cancelled = false;
    const p = inflight.get(key) ?? resolve(place, width);
    inflight.set(key, p);
    p.then((u) => {
      cache.set(key, u);
      inflight.delete(key);
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return url;
}
