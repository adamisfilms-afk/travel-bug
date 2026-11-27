"use client";

import { CaretDown, ForkKnife, MapPin } from "@phosphor-icons/react";
import clsx from "clsx";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { ItineraryEntry, makeLookup } from "@/components/itinerary";
import { Map as TripMap } from "@/components/Map";
import { PlaceModal } from "@/components/PlaceModal";
import { FlightDetails, StayDetails } from "@/components/tripDetails";
import { tripMapPoints } from "@/components/tripPoints";
import { BRAND } from "@/lib/brand";
import { findCuratedPlace } from "@/lib/curated/types";
import { EXPLORE_GUIDES } from "@/lib/explore/guides";
import { FOOD_GUIDES } from "@/lib/food/guides";
import { longDay, rangeLabel } from "@/lib/format";
import type { SharedTrip } from "@/lib/share";
import type { ItineraryItem } from "@/lib/types";

const GUIDES = [
  { kind: "food" as const, guides: FOOD_GUIDES },
  { kind: "explore" as const, guides: EXPLORE_GUIDES },
];

type Curated = NonNullable<ReturnType<typeof findCuratedPlace>>;

/** A shared, read-only itinerary: the latest version the owner has published, with a map. */
export default function SharedItineraryPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<{ data: SharedTrip; updatedAt: string } | "loading" | { error: string }>("loading");

  const load = useCallback(() => {
    fetch(`/api/share/${token}`, { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d?.error ?? "Couldn't load this itinerary.");
        setState({ data: d.data, updatedAt: d.updatedAt });
      })
      .catch((e: Error) => setState((cur) => (typeof cur === "object" && "data" in cur ? cur : { error: e.message })));
  }, [token]);

  // Load now, then keep it fresh while the page is open
  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    window.addEventListener("focus", load);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", load);
    };
  }, [load]);

  if (state === "loading") return <div className="min-h-screen grid place-items-center text-ink-muted">Loading itinerary…</div>;
  if ("error" in state)
    return (
      <div className="min-h-screen grid place-items-center px-6 text-center">
        <div className="space-y-3">
          <p className="font-serif text-[34px]">Itinerary not found</p>
          <p className="text-ink-muted">{state.error}</p>
          <Link href="/" className="inline-block underline underline-offset-4">
            Go to {BRAND}
          </Link>
        </div>
      </div>
    );
  return <SharedItinerary data={state.data} updatedAt={state.updatedAt} />;
}

function SharedItinerary({ data, updatedAt }: { data: SharedTrip; updatedAt: string }) {
  const { trip, flights, stays, activities, itinerary } = data;
  const lookup = useMemo(() => makeLookup(flights, stays, activities), [flights, stays, activities]);
  const points = useMemo(() => tripMapPoints(trip.id, { itinerary, stays, activities }, lookup), [trip.id, itinerary, stays, activities, lookup]);
  const byDay = useMemo(() => {
    const m: Record<string, ItineraryItem[]> = {};
    for (const it of itinerary) (m[it.day] ??= []).push(it);
    for (const d of Object.keys(m)) m[d].sort((a, b) => a.position - b.position);
    return m;
  }, [itinerary]);
  const days = Object.keys(byDay).sort();
  const [hovered, setHovered] = useState<string | null>(null);
  const [openPlace, setOpenPlace] = useState<Curated | null>(null);
  const places = (trip.locations?.length ? trip.locations : [trip.destination]).join(" · ");

  useEffect(() => {
    document.title = `${trip.name} · ${BRAND}`;
  }, [trip.name]);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <main className="px-5 md:px-12 py-8 md:py-10">
        <div className="max-w-[640px] space-y-8">
          <header className="space-y-2">
            <Link href="/" className="text-[15px] font-bold tracking-tight">
              {BRAND}
            </Link>
            <h1 className="font-serif text-[40px] md:text-[54px] leading-[1.05] pt-4">{trip.name}</h1>
            <p className="text-[14px] text-ink-muted">
              {rangeLabel(trip.startDate, trip.endDate)} · {places}
            </p>
          </header>

          {days.length === 0 ? (
            <p className="text-ink-muted">Nothing on this itinerary yet.</p>
          ) : (
            <div>
              {days.map((day, i) => (
                <Fragment key={day}>
                  {i > 0 && <div className="dotted-rule my-6" />}
                  <h2 className="text-[16px] font-semibold mb-3">{longDay(day)}</h2>
                  <div className="space-y-1.5">
                    {byDay[day].map((item) => (
                      <SharedEntry key={item.id} item={item} data={data} lookup={lookup} hovered={hovered} onHover={setHovered} onOpenPlace={setOpenPlace} />
                    ))}
                  </div>
                </Fragment>
              ))}
            </div>
          )}

          <p className="text-[12px] text-ink-muted pt-4">
            Last updated {new Date(updatedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} · Planned with {BRAND}
          </p>
        </div>
      </main>

      <aside className="h-[420px] lg:h-screen lg:sticky lg:top-0 border-t lg:border-t-0 lg:border-l border-line">
        <TripMap
          points={points}
          legend
          highlightedId={points.find((p) => (p.ref ?? p.id) === hovered)?.id ?? null}
          onPointHover={(id) => setHovered(id ? (points.find((p) => p.id === id)?.ref ?? id) : null)}
        />
      </aside>

      {openPlace && (
        <PlaceModal
          key={openPlace.place.id}
          place={openPlace.place}
          guide={openPlace.guide}
          kind={openPlace.kind}
          curate={false}
          readOnly
          photoPick={openPlace.place.photo}
          EmptyIcon={openPlace.kind === "food" ? ForkKnife : MapPin}
          onClose={() => setOpenPlace(null)}
        />
      )}
    </div>
  );
}

function SharedEntry({
  item,
  data,
  lookup,
  hovered,
  onHover,
  onOpenPlace,
}: {
  item: ItineraryItem;
  data: SharedTrip;
  lookup: ReturnType<typeof makeLookup>;
  hovered: string | null;
  onHover: (key: string | null) => void;
  onOpenPlace: (c: Curated) => void;
}) {
  const [open, setOpen] = useState(false);
  const key = `${item.kind}:${item.refId}`;
  const flight = item.kind === "flight" ? lookup.flights.get(item.refId) : undefined;
  const stay = item.kind === "stay" ? lookup.stays.get(item.refId) : undefined;
  const activity = item.kind === "activity" ? lookup.activities.get(item.refId) : undefined;
  const curated = useMemo(() => (activity ? findCuratedPlace(GUIDES, activity.name, data.trip.destination) : null), [activity, data.trip.destination]);
  const expandable = !!(flight || stay);
  const clickable = expandable || !!curated;

  return (
    <div
      onMouseEnter={() => onHover(key)}
      onMouseLeave={() => onHover(null)}
      className={clsx("relative rounded-lg -mx-2 px-2 py-1.5 transition-colors", hovered === key && "bg-surface")}
    >
      <div
        role={clickable ? "button" : undefined}
        tabIndex={clickable ? 0 : undefined}
        aria-expanded={expandable ? open : undefined}
        onClick={() => (expandable ? setOpen((o) => !o) : curated && onOpenPlace(curated))}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && clickable && (e.preventDefault(), expandable ? setOpen((o) => !o) : curated && onOpenPlace(curated))}
        className={clsx("pr-7 outline-none", clickable && "cursor-pointer [&_p.font-semibold]:hover:underline [&_p.font-semibold]:underline-offset-2")}
        title={expandable ? (open ? "Hide details" : "Show details") : curated ? `About ${curated.place.name}` : undefined}
      >
        <ItineraryEntry item={item} lookup={lookup} />
      </div>
      {expandable && (
        <CaretDown
          aria-hidden
          className={clsx("absolute right-2 top-2.5 size-3.5 text-ink/40 transition-transform pointer-events-none", open && "rotate-180")}
        />
      )}
      {open && (flight || stay) && (
        <div className="mt-3 mb-1 pt-3 border-t border-line/70">{flight ? <FlightDetails f={flight} /> : stay && <StayDetails s={stay} />}</div>
      )}
    </div>
  );
}
