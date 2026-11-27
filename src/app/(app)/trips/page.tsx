"use client";

import { Plus } from "@phosphor-icons/react";
import clsx from "clsx";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { NewTripDialog, tripLocations } from "@/components/trips";
import { PageTitle, SectionTitle } from "@/components/ui";
import { cityGuideBySlug, matchCityGuides } from "@/lib/curated/city-guides";
import { useCuratedCover } from "@/lib/curated/cover";
import { applyOverride, useOverrides } from "@/lib/curated/overrides";
import { findCuratedPlace, type CuratedPlace } from "@/lib/curated/types";
import { EXPLORE_GUIDES } from "@/lib/explore/guides";
import { FOOD_GUIDES } from "@/lib/food/guides";
import { rangeLabel, toDay } from "@/lib/format";
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
function useTripCover(trip: Trip): string | null {
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

function TripCard({ trip }: { trip: Trip }) {
  const cover = useTripCover(trip);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [cover]);
  return (
    <Link
      href={`/trips/${trip.id}`}
      className="group film-grain relative block aspect-[5/6] rounded-2xl overflow-hidden bg-guide-bg outline-none focus-visible:ring-2 focus-visible:ring-guide-active"
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
        <p className="font-serif text-[24px] md:text-[28px] leading-[1.1]">{trip.name}</p>
        <p className="mt-1.5 text-[13px] text-guide-ink/85">{rangeLabel(trip.startDate, trip.endDate)}</p>
      </div>
    </Link>
  );
}

const GRID = "grid gap-6 md:gap-7 grid-cols-[repeat(auto-fill,minmax(240px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(280px,340px))]";

function TripsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const trips = useStore((s) => s.trips);
  const ready = useStore((s) => s.ready);
  const [creating, setCreating] = useState(false);

  // Old links (/trips?trip=…) go straight to that trip's planner
  useEffect(() => {
    const id = params.get("trip");
    if (id) router.replace(`/trips/${id}`);
  }, [params, router]);

  const today = toDay(new Date());
  const upcoming = useMemo(() => trips.filter((t) => t.endDate >= today).sort((a, b) => a.startDate.localeCompare(b.startDate)), [trips, today]);
  const past = useMemo(() => trips.filter((t) => t.endDate < today).sort((a, b) => b.startDate.localeCompare(a.startDate)), [trips, today]);

  return (
    <div className="space-y-8">
      <PageTitle>Your trips</PageTitle>

      <section className="space-y-5">
        <SectionTitle>Upcoming</SectionTitle>
        <div className={GRID}>
          {!ready && <div className="aspect-[5/6] rounded-2xl bg-surface animate-pulse" />}
          {upcoming.map((t) => (
            <TripCard key={t.id} trip={t} />
          ))}
          {ready && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className={clsx(
                "aspect-[5/6] rounded-2xl border-2 border-dashed border-line text-ink-muted",
                "flex flex-col items-center justify-center gap-3 hover:border-ink/40 hover:text-ink transition-colors",
              )}
            >
              <span className="grid place-items-center size-12 rounded-full bg-accent text-white">
                <Plus weight="bold" className="size-5" />
              </span>
              <span className="text-[15px]">Plan a new trip</span>
            </button>
          )}
        </div>
      </section>

      {past.length > 0 && (
        <section className="space-y-5">
          <SectionTitle>Past</SectionTitle>
          <div className={GRID}>
            {past.map((t) => (
              <TripCard key={t.id} trip={t} />
            ))}
          </div>
        </section>
      )}

      <NewTripDialog open={creating} onClose={() => setCreating(false)} onCreated={(t) => router.push(`/trips/${t.id}`)} />
    </div>
  );
}

export default function TripsPage() {
  return (
    <Suspense>
      <TripsInner />
    </Suspense>
  );
}
