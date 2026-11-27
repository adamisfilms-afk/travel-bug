"use client";

import clsx from "clsx";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { tripLocations } from "@/components/trips";
import { useAccountInfo } from "@/lib/auth";
import { cityGuideBySlug, matchCityGuides } from "@/lib/curated/city-guides";
import { useCuratedCover } from "@/lib/curated/cover";
import { applyOverride, useOverrides } from "@/lib/curated/overrides";
import { findCuratedPlace, type CuratedPlace } from "@/lib/curated/types";
import { EXPLORE_GUIDES } from "@/lib/explore/guides";
import { FOOD_GUIDES } from "@/lib/food/guides";
import { rangeLabel } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Trip } from "@/lib/types";

const GUIDES = [
  { kind: "food" as const, guides: FOOD_GUIDES },
  { kind: "explore" as const, guides: EXPLORE_GUIDES },
];

/**
 * The photo that represents a trip: a curated place saved to it, else a saved stay's photo,
 * else a highlight from the city guide for its first location. None = the plain dark card.
 */
export function useTripCover(trip: Trip): string | null {
  const activities = useStore((s) => s.activities);
  const stays = useStore((s) => s.stays);
  const overrides = useOverrides((s) => s.overrides);
  const loadOverrides = useOverrides((s) => s.load);
  useEffect(loadOverrides, [loadOverrides]);

  const place: CuratedPlace | null = useMemo(() => {
    for (const a of activities) {
      if (a.tripId !== trip.id) continue;
      const hit = findCuratedPlace(GUIDES, a.name, trip.destination);
      if (hit) return hit.place;
    }
    if (stays.some((s) => s.tripId === trip.id && s.imageUrl)) return null;
    for (const loc of tripLocations(trip)) {
      const guide = matchCityGuides(loc)[0] ?? cityGuideBySlug(loc.toLowerCase());
      const first = guide?.sections[0]?.places[0];
      if (first) return first;
    }
    return null;
  }, [activities, stays, trip]);

  const curated = useCuratedCover(place ? applyOverride(place, overrides[place.id]) : null);
  const stayImage = stays.find((s) => s.tripId === trip.id && s.imageUrl)?.imageUrl ?? null;
  return curated ?? (place ? null : stayImage);
}

export function TripCard({ trip, children, className }: { trip: Trip; children?: React.ReactNode; className?: string }) {
  const cover = useTripCover(trip);
  const account = useAccountInfo();
  const shared = Boolean(account.id && trip.userId && trip.userId !== account.id);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [cover]);
  return (
    <Link
      href={`/trips/${trip.id}`}
      className={clsx("group film-grain relative block rounded-2xl overflow-hidden bg-guide-bg outline-none focus-visible:ring-2 focus-visible:ring-guide-active", className ?? "aspect-[5/6]")}
    >
      {cover && !failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cover}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 size-full object-cover film-photo transition-transform duration-500 group-hover:scale-[1.04]"
        />
      )}
      <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" aria-hidden />
      <div className="absolute inset-x-0 bottom-0 p-5 md:p-6 text-guide-ink">
        {shared && <span className="inline-block mb-2 rounded-full bg-guide-active text-guide-bg text-[11px] px-2 py-0.5">Shared with you</span>}
        <p className="font-serif text-[24px] md:text-[28px] leading-[1.1]">{trip.name}</p>
        <p className="mt-1.5 text-[13px] text-guide-ink/85">{rangeLabel(trip.startDate, trip.endDate)}</p>
        {children}
      </div>
    </Link>
  );
}

