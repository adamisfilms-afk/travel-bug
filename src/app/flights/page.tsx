"use client";

import { ArrowsDownUp, ArrowsLeftRight, CalendarBlank, CaretDown, Check } from "@phosphor-icons/react";
import clsx from "clsx";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { AirlineLogo } from "@/components/AirlineLogo";
import { AirportInput } from "@/components/AirportInput";
import { PriceRange } from "@/components/PriceRange";
import { RangeSlider } from "@/components/RangeSlider";
import { AddToTripButton } from "@/components/trips";
import { FilterChip, PageTitle, PrimaryButton } from "@/components/ui";
import { AIRPORTS, findAirport } from "@/lib/airports";
import { addDays, durationLabel, hhmm, money, shortDate, toDay } from "@/lib/format";
import { FULL_DAY, useSearchStore, type FlightSession, type FlightSort, type HourRange } from "@/lib/searchStore";
import { useStore } from "@/lib/store";
import type { Cabin, FlightLeg, FlightOffer, Place } from "@/lib/types";

const CABINS: { value: Cabin; label: string }[] = [
  { value: "economy", label: "Economy" },
  { value: "premium_economy", label: "Premium" },
  { value: "business", label: "Business" },
  { value: "first", label: "First" },
];

/** Result row columns: route | airline | flight no. | times | date | duration (later ones hide on small screens). */
const ROW_COLS =
  "grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_96px] md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_60px_96px] lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_60px_96px_92px] xl:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_60px_96px_92px_110px]";

const segCls = "flex items-center gap-2 h-11 px-4";
const selectCls = "bg-transparent outline-none text-[14px] cursor-pointer";

const SORTS: { value: FlightSort; label: string; short: string }[] = [
  { value: "price", label: "Price (lowest first)", short: "Price" },
  { value: "depart", label: "Departure time (earliest first)", short: "Departure" },
  { value: "arrive", label: "Arrival time (earliest first)", short: "Arrival" },
  { value: "duration", label: "Journey time (shortest first)", short: "Journey time" },
];

const totalMins = (o: FlightOffer) => o.legs.reduce((n, l) => n + l.durationMins, 0);

function sortOffers(offers: FlightOffer[], sort: FlightSort) {
  const by: Record<FlightSort, (a: FlightOffer, b: FlightOffer) => number> = {
    price: (a, b) => a.price - b.price,
    depart: (a, b) => a.legs[0].depart.localeCompare(b.legs[0].depart),
    arrive: (a, b) => a.legs[0].arrive.localeCompare(b.legs[0].arrive),
    duration: (a, b) => totalMins(a) - totalMins(b),
  };
  return [...offers].sort((a, b) => by[sort](a, b) || a.price - b.price);
}

const hourLabel = (h: number) => `${String(h).padStart(2, "0")}:00`;
const isFull = (r: HourRange) => r[0] === 0 && r[1] === 24;
const rangeText = (r: HourRange) => `${hourLabel(r[0])}–${hourLabel(r[1])}`;

/** Is the local time of `iso` within [from, to] hours? */
function inHours(iso: string, [from, to]: HourRange) {
  const h = Number(iso.slice(11, 13)) + Number(iso.slice(14, 16)) / 60;
  return h >= from && h <= to;
}

function cityAirport(destination: string): Place | null {
  const d = destination.toLowerCase();
  return AIRPORTS.find((a) => a.city.toLowerCase() === d || (d === "nyc" && a.code === "JFK")) ?? null;
}

function initialSession(): FlightSession {
  return {
    from: null,
    to: null,
    depart: addDays(toDay(new Date()), 30),
    ret: "",
    adults: 1,
    cabin: "economy",
    offers: null,
    source: "",
    price: null,
    stops: "any",
    airlines: [],
    outDepart: FULL_DAY,
    outArrive: FULL_DAY,
    backDepart: FULL_DAY,
    backArrive: FULL_DAY,
    sort: "price",
    prefilledFor: null,
  };
}

const RESET_FILTERS: Partial<FlightSession> = {
  price: null,
  stops: "any",
  airlines: [],
  outDepart: FULL_DAY,
  outArrive: FULL_DAY,
  backDepart: FULL_DAY,
  backArrive: FULL_DAY,
};

function TimesFilter({
  label,
  depart,
  arrive,
  onChange,
}: {
  label: string;
  depart: HourRange;
  arrive: HourRange;
  onChange: (d: HourRange, a: HourRange) => void;
}) {
  const active = !isFull(depart) || !isFull(arrive);
  return (
    <FilterChip label={label} active={active} onClear={() => onChange(FULL_DAY, FULL_DAY)}>
      <div className="w-64 space-y-4">
        <RangeSlider label="Departs" min={0} max={24} value={depart} onChange={(v) => onChange(v, arrive)} format={hourLabel} />
        <RangeSlider label="Arrives" min={0} max={24} value={arrive} onChange={(v) => onChange(depart, v)} format={hourLabel} />
      </div>
    </FilterChip>
  );
}

function LegLine({ leg }: { leg: FlightLeg }) {
  return (
    // One fixed grid at every width so airline / flight number / times always line up;
    // lower-priority columns drop out on narrower screens.
    <div className={clsx("text-[14px] leading-6 grid gap-x-4 items-center", ROW_COLS)}>
      <span className="truncate" title={`${leg.from.name} (${leg.from.code}) - ${leg.to.name} (${leg.to.code})`}>
        {leg.from.name} ({leg.from.code}) - {leg.to.name} ({leg.to.code})
      </span>
      <span className="flex items-center gap-1.5 min-w-0 text-ink-muted">
        <AirlineLogo leg={leg} />
        <span className="truncate">{leg.carrier}</span>
      </span>
      <span className="hidden md:block text-ink-muted whitespace-nowrap">{leg.flightNumber}</span>
      <span className="text-ink-muted whitespace-nowrap tabular-nums">
        {hhmm(leg.depart)} - {hhmm(leg.arrive)}
      </span>
      <span className="hidden lg:block text-ink-muted whitespace-nowrap">{shortDate(leg.depart)}</span>
      <span className="hidden xl:block text-ink-muted whitespace-nowrap text-[13px]">
        {durationLabel(leg.durationMins)} · {leg.stops ? `${leg.stops} stop${leg.stops > 1 ? "s" : ""}` : "Direct"}
      </span>
    </div>
  );
}

/** Fixed-width action area so outbound and return rows keep the same columns. */
const ACTIONS = "h-6 flex items-center justify-end gap-2 w-[196px] shrink-0";

function BookLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title="Book this flight"
      className="h-8 px-4 rounded-full bg-accent text-white text-[14px] hover:bg-accent-hover inline-flex items-center"
    >
      Book
    </a>
  );
}

function tripDefaults(o: FlightOffer) {
  return {
    destination: o.legs[0].to.city,
    startDate: o.legs[0].depart.slice(0, 10),
    endDate: o.legs[1]?.depart.slice(0, 10) ?? o.returnDate ?? o.legs[0].depart.slice(0, 10),
    travellers: o.passengers,
  };
}

function FlightRow({
  offer: o,
  returns,
  onReturns,
  returnFilter,
  savedTrips,
  onSave,
}: {
  offer: FlightOffer;
  returns?: FlightOffer[];
  onReturns: (list: FlightOffer[]) => void;
  returnFilter: (r: FlightOffer) => boolean;
  savedTrips: (o: FlightOffer) => string[];
  onSave: (tripId: string, o: FlightOffer) => void;
}) {
  const needsReturn = Boolean(o.departureToken);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const toggleReturns = async () => {
    const next = !open;
    setOpen(next);
    if (!next || returns) return;
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/flights/returns", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ outbound: o }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't load return flights");
      onReturns(data.offers);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't load return flights");
    } finally {
      setLoading(false);
    }
  };

  const shownReturns = (returns ?? []).filter(returnFilter);

  return (
    <div className="rounded-[10px] bg-surface border border-transparent hover:dashed-accent px-4 py-2.5">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0 space-y-1">
          {o.legs.map((leg, i) => (
            <LegLine key={i} leg={leg} />
          ))}
        </div>
        <div className="w-[84px] text-right self-start leading-6">
          <span className="font-semibold text-[15px] tabular-nums">{money(o.price, o.currency)}</span>
          {needsReturn && <span className="block text-[11px] leading-3 text-ink-muted">round trip from</span>}
        </div>
        <div className={clsx(ACTIONS, "self-start")}>
          <BookLink href={o.bookingUrl} />
          {needsReturn ? (
            <button
              type="button"
              onClick={toggleReturns}
              aria-expanded={open}
              className="h-8 pl-3 pr-2.5 rounded-full border border-accent-soft bg-white text-accent-ink text-[13px] inline-flex items-center gap-1 hover:bg-accent-soft/20 whitespace-nowrap"
            >
              Choose return
              <CaretDown weight="bold" className={clsx("size-3 transition-transform", open && "rotate-180")} />
            </button>
          ) : (
            <AddToTripButton compact addedTo={savedTrips(o)} defaults={tripDefaults(o)} onAdd={(tripId) => onSave(tripId, o)} />
          )}
        </div>
      </div>

      {needsReturn && open && (
        <div className="mt-2.5 pt-2.5 border-t border-line/70 space-y-1.5">
          <p className="text-[12px] uppercase tracking-wider text-ink-muted">Return flights</p>
          {loading && <p className="text-[13px] text-ink-muted">Loading return flights…</p>}
          {err && <p className="text-[13px] text-price-up">{err}</p>}
          {returns && !loading && shownReturns.length === 0 && <p className="text-[13px] text-ink-muted">No return flights match these filters.</p>}
          {shownReturns.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-lg -mx-2 px-2 py-0.5 hover:bg-white/70">
              <div className="flex-1 min-w-0">
                <LegLine leg={r.legs[1]} />
              </div>
              <span className="w-[84px] text-right font-semibold text-[15px] leading-6 tabular-nums">{money(r.price, r.currency)}</span>
              <div className={ACTIONS}>
                <BookLink href={r.bookingUrl} />
                <AddToTripButton compact addedTo={savedTrips(r)} defaults={tripDefaults(r)} onAdd={(tripId) => onSave(tripId, r)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FlightsInner() {
  const params = useSearchParams();
  const ready = useStore((s) => s.ready);
  const trips = useStore((s) => s.trips);
  const saved = useStore((s) => s.flights);
  const saveFlight = useStore((s) => s.saveFlight);
  const presetTrip = trips.find((t) => t.id === params.get("trip"));

  const init = useMemo(initialSession, []);
  const session = useSearchStore((s) => s.flight) ?? init;
  const setFlight = useSearchStore((s) => s.setFlight);
  const set = (patch: Partial<FlightSession>) => setFlight(patch, init);
  const { from, to, depart, ret, adults, cabin, offers, source, price, stops, airlines } = session;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const today = toDay(new Date());

  // Prefill from a trip ("Find flights" in the planner) once per trip, so coming back keeps your edits.
  useEffect(() => {
    if (!ready || !presetTrip || useSearchStore.getState().flight?.prefilledFor === presetTrip.id) return;
    setFlight(
      {
        to: cityAirport(presetTrip.destination),
        from: useSearchStore.getState().flight?.from ?? findAirport("LHR") ?? null,
        depart: presetTrip.startDate,
        ret: presetTrip.endDate,
        adults: presetTrip.travellers,
        prefilledFor: presetTrip.id,
      },
      init,
    );
  }, [ready, presetTrip, init, setFlight]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const search = async () => {
    if (!from || !to) return setError("Choose where you're flying from and to.");
    if (!depart) return setError("Choose a departure date.");
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/flights/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ from: from.code, to: to.code, depart, returnDate: ret || undefined, adults, cabin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      set({ offers: data.offers, source: data.source, returns: {}, ...RESET_FILTERS });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
      set({ offers: null });
    } finally {
      setLoading(false);
    }
  };

  const bounds = useMemo(() => {
    if (!offers?.length) return [0, 0] as [number, number];
    const ps = offers.map((o) => o.price);
    return [Math.floor(Math.min(...ps)), Math.ceil(Math.max(...ps))] as [number, number];
  }, [offers]);
  const allAirlines = useMemo(() => [...new Set((offers ?? []).flatMap((o) => o.legs.map((l) => l.carrier)))].sort(), [offers]);
  const hasReturn = (offers ?? []).some((o) => o.legs.length > 1 || o.departureToken);

  const sort = session.sort ?? "price";
  const matching = (offers ?? []).filter((o) => {
    const [out, back] = o.legs;
    if (price && (o.price < price[0] || o.price > price[1])) return false;
    if (stops === "0" && o.legs.some((l) => l.stops > 0)) return false;
    if (stops === "1" && o.legs.some((l) => l.stops > 1)) return false;
    if (airlines.length && !o.legs.some((l) => airlines.includes(l.carrier))) return false;
    if (!inHours(out.depart, session.outDepart) || !inHours(out.arrive, session.outArrive)) return false;
    if (back && (!inHours(back.depart, session.backDepart) || !inHours(back.arrive, session.backArrive))) return false; // returns of two-step offers are filtered in FlightRow
    return true;
  });
  const filtered = sortOffers(matching, sort);

  const savedKey = (legs: FlightOffer["legs"]) => legs.map((l) => `${l.flightNumber}@${l.depart}`).join("|");
  const savedTrips = (o: FlightOffer) => saved.filter((s) => savedKey(s.legs) === savedKey(o.legs)).map((s) => s.tripId);

  const timesLabel = (base: string, d: HourRange, a: HourRange) =>
    isFull(d) && isFull(a) ? base : `${base}: ${!isFull(d) ? `dep ${rangeText(d)}` : ""}${!isFull(d) && !isFull(a) ? ", " : ""}${!isFull(a) ? `arr ${rangeText(a)}` : ""}`;

  return (
    <div className="space-y-5">
      <PageTitle>Flights</PageTitle>

      <form
        className="pt-2 flex flex-wrap items-start gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void search();
        }}
      >
        <div className="flex flex-wrap items-stretch rounded-[10px] bg-surface border border-white/70 divide-x divide-line/70 min-w-0">
          <div className="flex items-center gap-3 h-11 px-4 w-full sm:w-[380px]">
            <AirportInput value={from} onChange={(p) => set({ from: p })} placeholder="From?" ariaLabel="From" />
            <button
              type="button"
              aria-label="Swap origin and destination"
              onClick={() => set({ from: to, to: from })}
              className="p-1 rounded-full hover:bg-white"
            >
              <ArrowsLeftRight weight="bold" className="size-4" />
            </button>
            <AirportInput value={to} onChange={(p) => set({ to: p })} placeholder="Destination" ariaLabel="Destination" />
          </div>
          <label className={segCls}>
            <CalendarBlank weight="fill" className="size-4 shrink-0" />
            <input aria-label="Departure date" type="date" className={selectCls} value={depart} min={today} onChange={(e) => set({ depart: e.target.value })} />
            <span className="text-ink-muted">–</span>
            <input
              aria-label="Return date (optional)"
              type="date"
              className={clsx(selectCls, !ret && "text-ink-muted")}
              value={ret}
              min={depart}
              onChange={(e) => set({ ret: e.target.value })}
            />
          </label>
          <label className={segCls}>
            <span className="text-ink-muted text-[13px]">Travellers</span>
            <select aria-label="Travellers" className={selectCls} value={adults} onChange={(e) => set({ adults: Number(e.target.value) })}>
              {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className={segCls}>
            <span className="text-ink-muted text-[13px]">Cabin</span>
            <select aria-label="Cabin class" className={selectCls} value={cabin} onChange={(e) => set({ cabin: e.target.value as Cabin })}>
              {CABINS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <PrimaryButton type="submit" disabled={loading} className="ml-auto !h-11">
          {loading ? "Searching…" : "Search"}
        </PrimaryButton>
      </form>

      {error && <p className="text-price-up text-[14px]">{error}</p>}

      {offers && (
        <div className="flex items-start gap-3">
        <div className="flex flex-wrap gap-3 items-center flex-1 min-w-0">
          <FilterChip label={price ? `${money(price[0])} - ${money(price[1])}` : "Price"} active={!!price} onClear={() => set({ price: null })}>
            <PriceRange bounds={bounds} value={price ?? bounds} onChange={(v) => set({ price: v })} />
          </FilterChip>
          <FilterChip label={stops === "any" ? "Stops" : stops === "0" ? "Non-stop" : "Up to 1 stop"} active={stops !== "any"} onClear={() => set({ stops: "any" })}>
            <div className="space-y-2">
              {([
                ["any", "Any number of stops"],
                ["0", "Non-stop only"],
                ["1", "1 stop or fewer"],
              ] as const).map(([v, l]) => (
                <label key={v} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="stops" checked={stops === v} onChange={() => set({ stops: v })} className="accent-accent" />
                  {l}
                </label>
              ))}
            </div>
          </FilterChip>
          <FilterChip
            label={airlines.length ? `${airlines.length} airline${airlines.length > 1 ? "s" : ""}` : "Airlines"}
            active={airlines.length > 0}
            onClear={() => set({ airlines: [] })}
          >
            <div className="space-y-2 max-h-64 overflow-auto">
              {allAirlines.map((a) => (
                <label key={a} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-accent"
                    checked={airlines.includes(a)}
                    onChange={(e) => set({ airlines: e.target.checked ? [...airlines, a] : airlines.filter((x) => x !== a) })}
                  />
                  {a}
                </label>
              ))}
            </div>
          </FilterChip>
          <TimesFilter
            label={timesLabel("Outbound times", session.outDepart, session.outArrive)}
            depart={session.outDepart}
            arrive={session.outArrive}
            onChange={(d, a) => set({ outDepart: d, outArrive: a })}
          />
          {hasReturn && (
            <TimesFilter
              label={timesLabel("Return times", session.backDepart, session.backArrive)}
              depart={session.backDepart}
              arrive={session.backArrive}
              onChange={(d, a) => set({ backDepart: d, backArrive: a })}
            />
          )}
        </div>
        {/* Sort stays pinned top-right even when the filter chips wrap */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden md:inline text-[13px] text-ink-muted">
            {filtered.length} of {offers.length} results{source === "mock" ? " · demo data" : source === "searchapi" ? " · Google Flights" : ""}
          </span>
          <FilterChip
            align="right"
            icon={<ArrowsDownUp className="size-3.5" />}
            label={`Sort: ${SORTS.find((x) => x.value === sort)?.short}`}
          >
            {(close) => (
              <div className="-m-2 flex flex-col">
                {SORTS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => {
                      set({ sort: o.value });
                      close();
                    }}
                    className="flex items-center justify-between gap-6 rounded-lg px-3 py-2 text-left whitespace-nowrap hover:bg-surface"
                  >
                    {o.label}
                    {sort === o.value && <Check weight="bold" className="size-3.5 text-accent-ink" />}
                  </button>
                ))}
              </div>
            )}
          </FilterChip>
        </div>
        </div>
      )}

      <hr className="border-line" />

      {offers && filtered.length === 0 && <p className="text-ink-muted">No flights match these filters.</p>}

      <div className="space-y-3">
        {filtered.map((o) => (
          <FlightRow
            key={o.id}
            offer={o}
            returns={session.returns?.[o.id]}
            onReturns={(list) => set({ returns: { ...(useSearchStore.getState().flight?.returns ?? {}), [o.id]: list } })}
            returnFilter={(r) => inHours(r.legs[1].depart, session.backDepart) && inHours(r.legs[1].arrive, session.backArrive)}
            savedTrips={savedTrips}
            onSave={(tripId, offer) => {
              saveFlight(tripId, offer);
              setToast(`Saved to ${useStore.getState().trips.find((t) => t.id === tripId)?.name ?? "trip"}`);
            }}
          />
        ))}
      </div>

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-full bg-ink text-white text-[14px] px-5 py-2 shadow-lg">{toast}</div>}
    </div>
  );
}

export default function FlightsPage() {
  return (
    <Suspense>
      <FlightsInner />
    </Suspense>
  );
}
