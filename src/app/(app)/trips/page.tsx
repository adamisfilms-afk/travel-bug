"use client";

import { Plus } from "@phosphor-icons/react";
import clsx from "clsx";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { TripCard } from "@/components/TripCard";
import { NewTripDialog } from "@/components/trips";
import { PageTitle, SectionTitle } from "@/components/ui";
import { toDay } from "@/lib/format";
import { useStore } from "@/lib/store";

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
