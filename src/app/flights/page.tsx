"use client";

import { ArrowsLeftRight, CalendarBlank } from "@phosphor-icons/react";
import clsx from "clsx";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { AirportInput } from "@/components/AirportInput";
import { AddToTripButton } from "@/components/trips";
import { PriceRange } from "@/components/PriceRange";
import { FilterChip, PageTitle, PrimaryButton } from "@/components/ui";
import { AIRPORTS, findAirport } from "@/lib/airports";
import { addDays, durationLabel, hhmm, money, shortDate, toDay } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Cabin, FlightOffer, Place } from "@/lib/types";

const CABINS: { value: Cabin; label: string }[] = [
  { value: "economy", label: "Economy" },
  { value: "premium_economy", label: "Premium" },
  { value: "business", label: "Business" },
  { value: "first", label: "First" },
];

const WINDOWS = [
  { value: "any", label: "Any time", from: 0, to: 24 },
  { value: "night", label: "00:00–06:00", from: 0, to: 6 },
  { value: "morning", label: "06:00–12:00", from: 6, to: 12 },
  { value: "afternoon", label: "12:00–18:00", from: 12, to: 18 },
  { value: "evening", label: "18:00–24:00", from: 18, to: 24 },
] as const;
type Window = (typeof WINDOWS)[number]["value"];

function inWindow(iso: string, w: Window) {
  const win = WINDOWS.find((x) => x.value === w)!;
  const h = Number(iso.slice(11, 13));
  return h >= win.from && h < win.to;
}

const segCls = "flex items-center gap-2 h-[58px] px-4";
const selectCls = "bg-transparent outline-none text-[16px] cursor-pointer";

function cityAirport(destination: string): Place | null {
  const d = destination.toLowerCase();
  return AIRPORTS.find((a) => a.city.toLowerCase() === d || (d === "nyc" && a.code === "JFK")) ?? null;
}

function FlightsInner() {
  const params = useSearchParams();
  const { trips, flights: saved, saveFlight, ready } = useStore();
  const presetTrip = trips.find((t) => t.id === params.get("trip"));

  const today = toDay(new Date());
  const [from, setFrom] = useState<Place | null>(null);
  const [to, setTo] = useState<Place | null>(null);
  const [depart, setDepart] = useState(addDays(today, 30));
  const [ret, setRet] = useState<string>("");
  const [adults, setAdults] = useState(1);
  const [cabin, setCabin] = useState<Cabin>("economy");
  const [departWin, setDepartWin] = useState<Window>("any");
  const [arriveWin, setArriveWin] = useState<Window>("any");

  const [offers, setOffers] = useState<FlightOffer[] | null>(null);
  const [source, setSource] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  // Post-search filters
  const [price, setPrice] = useState<[number, number] | null>(null);
  const [stops, setStops] = useState<"any" | "0" | "1">("any");
  const [airlines, setAirlines] = useState<string[]>([]);

  // Prefill from a trip (e.g. "Find flights" in the planner)
  useEffect(() => {
    if (!ready || !presetTrip) return;
    setTo(cityAirport(presetTrip.destination));
    setFrom((f) => f ?? findAirport("LHR") ?? null);
    setDepart(presetTrip.startDate);
    setRet(presetTrip.endDate);
    setAdults(presetTrip.travellers);
  }, [ready, presetTrip]);

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
      setOffers(data.offers);
      setSource(data.source);
      setPrice(null);
      setStops("any");
      setAirlines([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
      setOffers(null);
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

  const filtered = (offers ?? []).filter((o) => {
    const out = o.legs[0];
    if (price && (o.price < price[0] || o.price > price[1])) return false;
    if (stops === "0" && o.legs.some((l) => l.stops > 0)) return false;
    if (stops === "1" && o.legs.some((l) => l.stops > 1)) return false;
    if (airlines.length && !o.legs.some((l) => airlines.includes(l.carrier))) return false;
    if (!inWindow(out.depart, departWin) || !inWindow(out.arrive, arriveWin)) return false;
    return true;
  });

  const savedKey = (legs: FlightOffer["legs"]) => legs.map((l) => `${l.flightNumber}@${l.depart}`).join("|");
  const savedTrips = (o: FlightOffer) => saved.filter((s) => savedKey(s.legs) === savedKey(o.legs)).map((s) => s.tripId);

  return (
    <div className="space-y-6">
      <PageTitle>Flights</PageTitle>

      <form
        className="pt-4 flex flex-wrap items-start gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void search();
        }}
      >
        <div className="flex flex-wrap items-stretch rounded-[10px] bg-surface border border-white/70 divide-x divide-line/70 flex-1 min-w-0">
          <div className="flex items-center gap-3 h-[58px] px-5 w-full sm:w-auto sm:min-w-[340px] flex-1">
            <AirportInput value={from} onChange={setFrom} placeholder="From?" ariaLabel="From" />
            <button
              type="button"
              aria-label="Swap origin and destination"
              onClick={() => {
                setFrom(to);
                setTo(from);
              }}
              className="p-1.5 rounded-full hover:bg-white"
            >
              <ArrowsLeftRight weight="bold" className="size-5" />
            </button>
            <AirportInput value={to} onChange={setTo} placeholder="Destination" ariaLabel="Destination" />
          </div>
          <label className={segCls}>
            <CalendarBlank weight="fill" className="size-5 shrink-0" />
            <input aria-label="Departure date" type="date" className={selectCls} value={depart} min={today} onChange={(e) => setDepart(e.target.value)} />
            <span className="text-ink-muted">–</span>
            <input
              aria-label="Return date (optional)"
              type="date"
              className={clsx(selectCls, !ret && "text-ink-muted")}
              value={ret}
              min={depart}
              onChange={(e) => setRet(e.target.value)}
            />
          </label>
          <label className={segCls}>
            <span className="text-ink-muted text-sm">Travellers</span>
            <select aria-label="Travellers" className={selectCls} value={adults} onChange={(e) => setAdults(Number(e.target.value))}>
              {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className={segCls}>
            <span className="text-ink-muted text-sm">Cabin</span>
            <select aria-label="Cabin class" className={selectCls} value={cabin} onChange={(e) => setCabin(e.target.value as Cabin)}>
              {CABINS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className={segCls}>
            <span className="text-ink-muted text-sm">Depart</span>
            <select aria-label="Departure time" className={selectCls} value={departWin} onChange={(e) => setDepartWin(e.target.value as Window)}>
              {WINDOWS.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.label}
                </option>
              ))}
            </select>
          </label>
          <label className={segCls}>
            <span className="text-ink-muted text-sm">Arrive</span>
            <select aria-label="Arrival time" className={selectCls} value={arriveWin} onChange={(e) => setArriveWin(e.target.value as Window)}>
              {WINDOWS.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <PrimaryButton type="submit" disabled={loading} className="ml-auto">
          {loading ? "Searching…" : "Search"}
        </PrimaryButton>
      </form>

      {error && <p className="text-price-up">{error}</p>}

      {offers && (
        <div className="flex flex-wrap gap-6 items-center">
          <FilterChip
            label={price ? `${money(price[0])} - ${money(price[1])}` : "Price"}
            active={!!price}
            onClear={() => setPrice(null)}
          >
            <PriceRange bounds={bounds} value={price ?? bounds} onChange={setPrice} />
          </FilterChip>
          <FilterChip label={stops === "any" ? "Stops" : stops === "0" ? "Non-stop" : "Up to 1 stop"} active={stops !== "any"} onClear={() => setStops("any")}>
            <div className="space-y-2">
              {([
                ["any", "Any number of stops"],
                ["0", "Non-stop only"],
                ["1", "1 stop or fewer"],
              ] as const).map(([v, l]) => (
                <label key={v} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="stops" checked={stops === v} onChange={() => setStops(v)} className="accent-accent" />
                  {l}
                </label>
              ))}
            </div>
          </FilterChip>
          <FilterChip label={airlines.length ? `${airlines.length} airline${airlines.length > 1 ? "s" : ""}` : "Airlines"} active={airlines.length > 0} onClear={() => setAirlines([])}>
            <div className="space-y-2 max-h-64 overflow-auto">
              {allAirlines.map((a) => (
                <label key={a} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-accent"
                    checked={airlines.includes(a)}
                    onChange={(e) => setAirlines((xs) => (e.target.checked ? [...xs, a] : xs.filter((x) => x !== a)))}
                  />
                  {a}
                </label>
              ))}
            </div>
          </FilterChip>
          <span className="ml-auto text-sm text-ink-muted">
            {filtered.length} of {offers.length} results{source === "mock" && " · demo data (add SKYSCANNER_API_KEY for live prices)"}
          </span>
        </div>
      )}

      <hr className="border-line" />

      {offers && filtered.length === 0 && <p className="text-ink-muted text-lg">No flights match these filters.</p>}

      <div className="space-y-5">
        {filtered.map((o) => (
          <div key={o.id} className="rounded-[10px] bg-surface border border-transparent hover:dashed-accent px-5 py-4 flex items-center gap-4">
            <div className="flex-1 min-w-0 space-y-2.5">
              {o.legs.map((leg, i) => (
                <div key={i} className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_150px_80px_120px_110px_90px] gap-x-6 gap-y-0.5 text-[16px] xl:text-[17px]">
                  <span className="truncate">
                    {leg.from.name} ({leg.from.code}) - {leg.to.name} ({leg.to.code})
                  </span>
                  <span className="text-ink-muted truncate">{leg.carrier}</span>
                  <span className="text-ink-muted whitespace-nowrap">{leg.flightNumber}</span>
                  <span className="text-ink-muted whitespace-nowrap tabular-nums">
                    {hhmm(leg.depart)} - {hhmm(leg.arrive)}
                  </span>
                  <span className="text-ink-muted whitespace-nowrap">{shortDate(leg.depart)}</span>
                  <span className="text-ink-muted whitespace-nowrap text-sm self-center">
                    {durationLabel(leg.durationMins)} · {leg.stops ? `${leg.stops} stop` : "Direct"}
                  </span>
                </div>
              ))}
            </div>
            <span className="w-20 text-right font-semibold text-[18px] tabular-nums self-start pt-0.5">{money(o.price, o.currency)}</span>
            <AddToTripButton
              addedTo={savedTrips(o)}
              defaults={{ destination: o.legs[0].to.city, startDate: o.legs[0].depart.slice(0, 10), endDate: o.legs[1]?.depart.slice(0, 10) ?? o.legs[0].depart.slice(0, 10), travellers: o.passengers }}
              onAdd={(tripId) => {
                saveFlight(tripId, o);
                setToast(`Saved to ${useStore.getState().trips.find((t) => t.id === tripId)?.name ?? "trip"}`);
              }}
            />
          </div>
        ))}
      </div>

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-full bg-ink text-white px-5 py-2.5 shadow-lg">{toast}</div>}
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
