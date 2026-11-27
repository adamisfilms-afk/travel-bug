"use client";

import { ArrowRight, Check, MagnifyingGlass, Plus, X } from "@phosphor-icons/react";
import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { TripCard } from "@/components/TripCard";
import { NewTripDialog, tripLocations } from "@/components/trips";
import { SectionTitle, useClickOutside } from "@/components/ui";
import { CITY_GUIDES, matchCityGuides, type CityGuide } from "@/lib/curated/city-guides";
import { useCuratedCover } from "@/lib/curated/cover";
import { applyOverride, useOverrides } from "@/lib/curated/overrides";
import type { CuratedPlace } from "@/lib/curated/types";
import { addDays, daysBetween, eachDay, toDay } from "@/lib/format";
import { firstName, useAccountInfo } from "@/lib/auth";
import { useStore } from "@/lib/store";
import type { Trip } from "@/lib/types";

// ---------------------------------------------------------------------------
// Prompt bar: smart search for now, the AI copilot's input later
// ---------------------------------------------------------------------------

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const SHORT_MONTHS = MONTHS.map((m) => m.slice(0, 3));

type Action = { key: string; label: React.ReactNode; hint: string; run: () => void };

/** "Vienna and Budapest in March" → places ["Vienna", "Budapest"] and the next March's dates. */
function parsePrompt(text: string): { places: string[]; month: number | null } {
  let t = ` ${text.toLowerCase()} `;
  let month: number | null = null;
  const m = t.match(/\b(?:in|during|for)?\s*(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\b/);
  if (m) {
    const word = m[1].slice(0, 3);
    month = SHORT_MONTHS.indexOf(word);
    t = t.replace(m[0], " ");
  }
  t = t.replace(/\b(a |the )?(trip|weekend|holiday|vacation|getaway|days?|nights?|week)\b/g, " ").replace(/\b(to|in|plan|planning|go|going|visit|visiting|\d+)\b/g, " ");
  const places = t
    .split(/,|&|\band\b|\+|\//)
    .map((s) => s.trim().replace(/\s+/g, " "))
    .filter((s) => s.length > 1)
    .map((s) => matchCityGuides(s)[0]?.city ?? s.replace(/\b\p{L}/gu, (c) => c.toUpperCase()));
  return { places: [...new Set(places)], month };
}

function monthDates(month: number): { startDate: string; endDate: string } {
  const now = new Date();
  const year = month < now.getMonth() ? now.getFullYear() + 1 : now.getFullYear();
  const start = `${year}-${String(month + 1).padStart(2, "0")}-${month === now.getMonth() ? String(Math.min(28, now.getDate() + 7)).padStart(2, "0") : "01"}`;
  return { startDate: start, endDate: addDays(start, 4) };
}

function PromptBar({ trips, onPlan }: { trips: Trip[]; onPlan: (defaults: Partial<Trip>) => void }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  const actions: Action[] = useMemo(() => {
    const q = text.trim();
    if (!q) return [];
    const { places, month } = parsePrompt(q);
    const out: Action[] = [];
    const guides = new Map<string, CityGuide>();
    for (const p of places) {
      const g = matchCityGuides(p)[0];
      if (g) guides.set(g.slug, g);
    }
    for (const g of guides.values())
      out.push({ key: `guide:${g.slug}`, label: <>See the <b>{g.city}</b> city guide</>, hint: `${g.sections.reduce((n, s) => n + s.places.length, 0)} places`, run: () => router.push(`/guides?city=${g.slug}`) });
    for (const t of trips) {
      const locs = tripLocations(t).map((l) => l.toLowerCase());
      if (places.some((p) => locs.some((l) => l.includes(p.toLowerCase()) || p.toLowerCase().includes(l))) || t.name.toLowerCase().includes(q.toLowerCase()))
        out.push({ key: `trip:${t.id}`, label: <>Open your <b>{t.name}</b> trip</>, hint: "Trip planner", run: () => router.push(`/trips/${t.id}`) });
    }
    if (places.length)
      out.push({
        key: "plan",
        label: (
          <>
            Plan a trip to <b>{places.join(" & ")}</b>
            {month != null && <> in {MONTHS[month][0].toUpperCase() + MONTHS[month].slice(1)}</>}
          </>
        ),
        hint: "New trip",
        run: () => onPlan({ locations: places, destination: places[0], ...(month != null ? monthDates(month) : {}) }),
      });
    return out;
  }, [text, trips, router, onPlan]);

  const run = (a: Action) => {
    setOpen(false);
    setText("");
    a.run();
  };

  return (
    <div ref={ref} className="relative max-w-[720px]">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (actions[hi]) run(actions[hi]);
        }}
        className="flex items-center gap-3 h-14 pl-5 pr-2 rounded-2xl bg-surface-strong border border-line shadow-sm focus-within:border-ink/30 transition-colors"
      >
        <MagnifyingGlass className="size-5 text-ink-muted shrink-0" />
        <input
          aria-label="Where to next?"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            setHi(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") (e.preventDefault(), setHi((h) => Math.min(h + 1, actions.length - 1)));
            else if (e.key === "ArrowUp") (e.preventDefault(), setHi((h) => Math.max(h - 1, 0)));
            else if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Try “Vienna and Budapest in March”"
          className="flex-1 min-w-0 bg-transparent outline-none text-[16px] placeholder:text-ink-muted"
        />
        {text && (
          <button type="button" aria-label="Clear" onClick={() => setText("")} className="grid place-items-center size-8 rounded-full text-ink-muted hover:bg-surface">
            <X className="size-4" />
          </button>
        )}
        <button type="submit" aria-label="Go" disabled={!actions.length} className="grid place-items-center size-10 rounded-xl bg-accent text-white hover:bg-accent-hover disabled:opacity-40">
          <ArrowRight weight="bold" className="size-4" />
        </button>
      </form>

      {open && text.trim() && (
        <div className="absolute left-0 right-0 top-full mt-2 z-30 rounded-xl bg-surface-strong shadow-lg border border-line py-2 text-[14px]">
          {actions.map((a, i) => (
            <button
              key={a.key}
              type="button"
              onMouseEnter={() => setHi(i)}
              onClick={() => run(a)}
              className={clsx("w-full text-left px-4 py-2.5 flex items-center justify-between gap-3", i === hi && "bg-surface")}
            >
              <span className="min-w-0 truncate [&_b]:font-semibold">{a.label}</span>
              <span className="shrink-0 text-[12px] text-ink-muted">{a.hint}</span>
            </button>
          ))}
          {!actions.length && <p className="px-4 py-2 text-ink-muted">Type a city to see its guide or start a trip.</p>}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Your next trip: progress and the one next step
// ---------------------------------------------------------------------------

function NextTrip({ trip }: { trip: Trip }) {
  const flights = useStore((s) => s.flights);
  const stays = useStore((s) => s.stays);
  const itinerary = useStore((s) => s.itinerary);
  const activities = useStore((s) => s.activities);
  const today = toDay(new Date());

  const tripItems = itinerary.filter((i) => i.tripId === trip.id);
  const savedFlight = flights.some((f) => f.tripId === trip.id);
  const savedStay = stays.some((s) => s.tripId === trip.id);
  // Only ticked once they're actually on the itinerary
  const flightPlaced = tripItems.some((i) => i.kind === "flight");
  const stayPlaced = tripItems.some((i) => i.kind === "stay");
  const saves = activities.filter((a) => a.tripId === trip.id).length;
  const days = eachDay(trip.startDate, trip.endDate);
  const planned = new Set(tripItems.map((i) => i.day));
  const firstEmpty = days.find((d) => !planned.has(d) && d >= today);
  const openDays = days.filter((d) => !planned.has(d) && d >= today).length;
  const inDays = daysBetween(today, trip.startDate);
  const when = trip.startDate <= today ? "Happening now" : inDays === 1 ? "Tomorrow" : `In ${inDays} days`;
  const place = tripLocations(trip)[0];
  const guide = matchCityGuides(place)[0];
  const dayLabel = (d: string) => new Date(`${d}T12:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });

  const next: { label: string; href: string; why: string } = !savedFlight
    ? { label: "Find flights", href: `/flights?trip=${trip.id}`, why: "You haven't saved a flight yet." }
    : !flightPlaced
      ? { label: "Add your flight", href: `/trips/${trip.id}`, why: "Your flight is saved — drag it onto its day in the planner." }
      : !savedStay
        ? { label: `Find a stay in ${place}`, href: `/stays?trip=${trip.id}&q=${encodeURIComponent(place)}`, why: "You've got flights — now somewhere to stay." }
        : !stayPlaced
          ? { label: "Add your stay", href: `/trips/${trip.id}`, why: "Your stay is saved — drag it onto your check-in day." }
          : saves === 0
            ? { label: guide ? `Browse the ${guide.city} guide` : "Browse the city guides", href: guide ? `/guides?city=${guide.slug}` : "/guides", why: "Save some places to eat and things to do." }
            : firstEmpty
              ? { label: `Plan ${dayLabel(firstEmpty)}`, href: `/trips/${trip.id}`, why: `${openDays} day${openDays === 1 ? "" : "s"} still open on the itinerary.` }
              : { label: "Open the trip planner", href: `/trips/${trip.id}`, why: "Everything's planned. Check prices before you book." };

  const Step = ({ done, children }: { done: boolean; children: React.ReactNode }) => (
    <span className={clsx("inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[12px]", done ? "bg-guide-active text-guide-bg" : "bg-white/15 text-guide-ink")}>
      {done ? <Check weight="bold" className="size-3" /> : <span className="size-1.5 rounded-full bg-guide-ink/60" />}
      {children}
    </span>
  );

  return (
    <section className="space-y-4">
      <SectionTitle>Your next trip</SectionTitle>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] items-stretch max-w-[1100px]">
        <TripCard trip={trip} className="aspect-[16/9] lg:aspect-auto lg:min-h-[300px]">
          <div className="mt-4 flex flex-wrap gap-2">
            <Step done={flightPlaced}>Flights</Step>
            <Step done={stayPlaced}>Stay</Step>
            <span className="inline-flex items-center h-7 px-3 rounded-full text-[12px] bg-white/15 text-guide-ink">
              {saves} {saves === 1 ? "save" : "saves"}
            </span>
          </div>
        </TripCard>
        <div className="rounded-2xl bg-surface p-6 flex flex-col justify-between gap-6">
          <div>
            <p className="text-[13px] text-ink-muted">{when}</p>
            <p className="font-serif text-[26px] leading-tight mt-1">Next step</p>
            <p className="text-[14px] text-ink-muted mt-2">{next.why}            </p>
          </div>
          <Link href={next.href} className="inline-flex items-center justify-between gap-3 h-11 px-5 rounded-full bg-accent text-white text-[15px] hover:bg-accent-hover">
            {next.label} <ArrowRight weight="bold" className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// From the guides
// ---------------------------------------------------------------------------

function GuideCard({ guide }: { guide: CityGuide }) {
  const overrides = useOverrides((s) => s.overrides);
  const first = guide.sections[0]?.places.find((p) => !overrides[p.id]?.hidden);
  const cover = useCuratedCover(first ? applyOverride(first, overrides[first.id]) : null);
  const count = guide.sections.flatMap((s) => s.places).filter((p) => !overrides[p.id]?.hidden).length;
  return (
    <Link href={`/guides?city=${guide.slug}`} className="group film-grain relative block shrink-0 w-[220px] md:w-[250px] aspect-[5/6] rounded-2xl overflow-hidden bg-guide-bg snap-start">
      {cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="" loading="lazy" className="absolute inset-0 size-full object-cover film-photo transition-transform duration-500 group-hover:scale-[1.04]" />
      )}
      <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" aria-hidden />
      <div className="absolute inset-x-0 bottom-0 p-5 text-guide-ink">
        <p className="font-serif text-[26px] leading-tight">{guide.city}</p>
        <p className="mt-1 text-[12px] text-guide-ink/85">
          {guide.country} · {count} places
        </p>
      </div>
    </Link>
  );
}

function PickCard({ place, guide }: { place: CuratedPlace; guide: CityGuide }) {
  const cover = useCuratedCover(place);
  return (
    <Link href={`/guides?city=${guide.slug}&place=${place.id}`} className="group shrink-0 w-[190px] md:w-[210px] snap-start">
      <div className="film-grain relative aspect-[4/5] rounded-2xl overflow-hidden bg-guide-bg">
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" loading="lazy" className="absolute inset-0 size-full object-cover film-photo transition-transform duration-500 group-hover:scale-[1.04]" />
        )}
      </div>
      <p className="mt-2.5 text-[15px] font-semibold leading-tight truncate group-hover:underline underline-offset-2">{place.name}</p>
      <p className="text-[13px] text-ink-muted truncate">
        {place.tagline} · {guide.city}
      </p>
    </Link>
  );
}

/** A handful of places from across the guides that changes daily (only ones with a write-up). */
function useDailyPicks(n: number) {
  const overrides = useOverrides((s) => s.overrides);
  return useMemo(() => {
    const all = CITY_GUIDES.flatMap((g) =>
      g.sections.flatMap((s) => s.places.filter((p) => !overrides[p.id]?.hidden).map((p) => ({ place: applyOverride(p, overrides[p.id]), guide: g }))),
    );
    const pool = all.filter(({ place }) => place.description);
    const seed = Math.floor(Date.now() / 86_400_000);
    // Deterministic shuffle for the day
    const scored = pool.map((x, i) => ({ x, k: Math.sin(seed * 9301 + i * 49297) }));
    scored.sort((a, b) => a.k - b.k);
    // Spread across cities: round-robin by guide
    const byCity = new Map<string, typeof pool>();
    for (const { x } of scored) byCity.set(x.guide.slug, [...(byCity.get(x.guide.slug) ?? []), x]);
    const out: typeof pool = [];
    while (out.length < n && [...byCity.values()].some((l) => l.length)) for (const l of byCity.values()) if (l.length && out.length < n) out.push(l.shift()!);
    return out;
  }, [overrides]);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HomePage() {
  const router = useRouter();
  const account = useAccountInfo();
  const trips = useStore((s) => s.trips);
  const ready = useStore((s) => s.ready);
  const loadOverrides = useOverrides((s) => s.load);
  useEffect(loadOverrides, [loadOverrides]);
  const [planning, setPlanning] = useState<Partial<Trip> | null>(null);

  const today = toDay(new Date());
  const upcoming = useMemo(() => trips.filter((t) => t.endDate >= today).sort((a, b) => a.startDate.localeCompare(b.startDate)), [trips, today]);
  const [next, ...later] = upcoming;
  const picks = useDailyPicks(10);

  return (
    <div className="space-y-12">
      <section className="space-y-6">
        <h1 className="font-serif text-[40px] md:text-[54px] leading-[1.1] font-normal">
          Hey {account.enabled ? firstName(account.name, "there") : "Adam"},
          <br />
          Where to next?
        </h1>
        <PromptBar trips={trips} onPlan={setPlanning} />
      </section>

      {ready && next && <NextTrip trip={next} />}

      {ready && (later.length > 0 || !next) && (
        <section className="space-y-4">
          <SectionTitle>{next ? "Also coming up" : "Your trips"}</SectionTitle>
          <div className="-mr-5 md:-mr-12 flex gap-5 overflow-x-auto no-scrollbar pb-2 snap-x">
            {later.map((t) => (
              <div key={t.id} className="shrink-0 w-[220px] md:w-[250px] snap-start">
                <TripCard trip={t} />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setPlanning({})}
              className="shrink-0 w-[220px] md:w-[250px] aspect-[5/6] rounded-2xl border-2 border-dashed border-line text-ink-muted flex flex-col items-center justify-center gap-3 hover:border-ink/40 hover:text-ink transition-colors"
            >
              <span className="grid place-items-center size-11 rounded-full bg-accent text-white">
                <Plus weight="bold" className="size-5" />
              </span>
              <span className="text-[15px]">Plan a new trip</span>
            </button>
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <SectionTitle>City guides</SectionTitle>
          <Link href="/guides" className="text-[14px] underline underline-offset-4">
            All guides
          </Link>
        </div>
        <div className="-mr-5 md:-mr-12 flex gap-5 overflow-x-auto no-scrollbar pb-2 snap-x">
          {CITY_GUIDES.map((g) => (
            <GuideCard key={g.slug} guide={g} />
          ))}
        </div>
      </section>

      {picks.length > 0 && (
        <section className="space-y-4">
          <SectionTitle>Today&rsquo;s picks from the guides</SectionTitle>
          <div className="-mr-5 md:-mr-12 flex gap-5 overflow-x-auto no-scrollbar pb-2 snap-x">
            {picks.map(({ place, guide }) => (
              <PickCard key={place.id} place={place} guide={guide} />
            ))}
          </div>
        </section>
      )}

      <NewTripDialog
        open={planning != null}
        onClose={() => setPlanning(null)}
        defaults={planning ?? undefined}
        onCreated={(t) => router.push(`/trips/${t.id}`)}
      />
    </div>
  );
}
