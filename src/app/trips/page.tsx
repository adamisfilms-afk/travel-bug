"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, Suspense, useMemo } from "react";
import { ItineraryEntry, makeLookup } from "@/components/itinerary";
import { Map } from "@/components/Map";
import { itineraryPoints } from "@/components/tripPoints";
import { TripChips } from "@/components/trips";
import { PageTitle } from "@/components/ui";
import { longDay, rangeLabel } from "@/lib/format";
import { itineraryByDay, useStore } from "@/lib/store";

function TripsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const trips = useStore((s) => s.trips);
  const flights = useStore((s) => s.flights);
  const stays = useStore((s) => s.stays);
  const activities = useStore((s) => s.activities);
  const itinerary = useStore((s) => s.itinerary);
  const ready = useStore((s) => s.ready);

  const sorted = useMemo(() => [...trips].sort((a, b) => a.startDate.localeCompare(b.startDate)), [trips]);
  const trip = sorted.find((t) => t.id === params.get("trip")) ?? sorted[0];
  const lookup = useMemo(() => makeLookup(flights, stays, activities), [flights, stays, activities]);
  const byDay = useMemo(() => (trip ? itineraryByDay(itinerary, trip.id) : {}), [itinerary, trip]);
  const days = Object.keys(byDay).sort();
  const points = useMemo(
    () => (trip ? itineraryPoints(itinerary.filter((i) => i.tripId === trip.id), lookup) : []),
    [itinerary, trip, lookup],
  );

  return (
    <div className="space-y-7">
      <PageTitle>Your trips</PageTitle>
      <TripChips selectedId={trip?.id} onSelect={(id) => router.replace(`/trips?trip=${id}`, { scroll: false })} />
      <hr className="border-line" />

      {ready && !trip && <p className="text-ink-muted">No trips yet. Add one to start planning.</p>}

      {trip && (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <section className="min-w-0">
            <div className="flex items-baseline justify-between gap-4 max-w-[640px]">
              <div>
                <h3 className="text-[20px] font-bold">{trip.name} Itinerary</h3>
                <p className="text-ink-muted text-[14px]">{rangeLabel(trip.startDate, trip.endDate)}</p>
              </div>
              <Link href={`/trips/${trip.id}`} className="text-accent-ink underline underline-offset-4 text-[15px] whitespace-nowrap">
                Trip Planner
              </Link>
            </div>

            {days.length === 0 ? (
              <div className="mt-6 rounded-xl dashed-accent bg-surface p-6 max-w-[640px]">
                <p className="text-[16px]">Nothing on the itinerary yet.</p>
                <p className="text-ink-muted mt-1">
                  Open the{" "}
                  <Link href={`/trips/${trip.id}`} className="text-accent-ink underline">
                    Trip Planner
                  </Link>{" "}
                  and drag flights, stays and things to do onto days.
                </p>
              </div>
            ) : (
              <div className="mt-5 max-w-[640px]">
                {days.map((day, i) => (
                  <Fragment key={day}>
                    {i > 0 && <div className="dotted-rule my-6" />}
                    <h4 className="text-[16px] font-semibold mb-3.5">{longDay(day)}</h4>
                    <div className="space-y-3">
                      {byDay[day].map((item) => (
                        <ItineraryEntry key={item.id} item={item} lookup={lookup} />
                      ))}
                    </div>
                  </Fragment>
                ))}
              </div>
            )}
          </section>

          <section className="h-[360px] lg:h-[calc(100vh-200px)] lg:min-h-[460px] lg:sticky lg:top-8 overflow-hidden rounded-[10px]">
            <Map points={points} route />
          </section>
        </div>
      )}
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
