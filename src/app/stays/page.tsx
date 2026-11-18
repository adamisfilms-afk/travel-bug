"use client";

import { CalendarBlank, Heart, Star } from "@phosphor-icons/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Map, type MapPoint } from "@/components/Map";
import { PriceRange } from "@/components/PriceRange";
import { AddToTripButton } from "@/components/trips";
import { FilterChip, PageTitle, PrimaryButton } from "@/components/ui";
import { addDays, daysBetween, money, toDay } from "@/lib/format";
import { useSearchStore, type StaySession } from "@/lib/searchStore";
import { useStore } from "@/lib/store";
import type { Hotel } from "@/lib/types";

const selectCls = "bg-transparent outline-none text-[14px] cursor-pointer";

function HotelCard({
  h,
  nights,
  checkIn,
  checkOut,
  highlighted,
  onHover,
  onToast,
}: {
  h: Hotel;
  nights: number;
  checkIn: string;
  checkOut: string;
  highlighted: boolean;
  onHover: (id: string | null) => void;
  onToast: (m: string) => void;
}) {
  const stays = useStore((s) => s.stays);
  const saveStay = useStore((s) => s.saveStay);
  const savedTo = stays.filter((s) => s.hotelId === h.id && s.checkIn === checkIn && s.checkOut === checkOut).map((s) => s.tripId);
  return (
    // No overflow-hidden here: the "Add to trip" menu must be able to extend past the card.
    <article
      onMouseEnter={() => onHover(h.id)}
      onMouseLeave={() => onHover(null)}
      className={`relative rounded-xl bg-surface-strong flex flex-col sm:flex-row border-2 transition-colors ${highlighted ? "border-[#3b82f6]" : "border-transparent"}`}
    >
      <div className="sm:w-[170px] h-32 sm:h-auto shrink-0 relative rounded-t-[10px] sm:rounded-tr-none sm:rounded-l-[10px]" style={{ background: h.imageColor }}>
        <span className="absolute inset-x-0 bottom-2.5 flex justify-center gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className={`size-1.5 rounded-full ${i === 0 ? "bg-white" : "bg-white/50"}`} />
          ))}
        </span>
      </div>
      <div className="flex-1 min-w-0 p-3.5 flex flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[16px] font-semibold leading-tight">{h.name}</h3>
          <Heart weight={savedTo.length ? "fill" : "regular"} className={`size-4 shrink-0 ${savedTo.length ? "text-price-up" : "text-ink"}`} aria-label={savedTo.length ? "Saved" : "Not saved"} />
        </div>
        <div className="flex gap-0.5 text-[#e8604c]" aria-label={`${h.stars} stars`}>
          {Array.from({ length: h.stars }, (_, i) => (
            <Star key={i} weight="fill" className="size-3" />
          ))}
        </div>
        <p className="text-[13px]">{h.area}</p>
        <p className="text-[13px]">
          <span className="font-semibold">{h.rating.toFixed(1)}</span>
          <span className="text-ink-muted">/5 · {h.reviews.toLocaleString()} reviews</span>
        </p>
        <p className="text-[12px] text-ink/70 leading-relaxed">{h.tags.join(" • ")}</p>
      </div>
      <div className="sm:w-[190px] shrink-0 p-3.5 sm:border-l border-line flex flex-col gap-1">
        <p>
          <span className="text-[20px] font-bold">{money(h.pricePerNight, h.currency)}</span>
          <span className="text-[13px] text-ink-muted"> a night</span>
        </p>
        <p className="text-[13px] underline">{money(h.pricePerNight * nights, h.currency)} total</p>
        <p className="text-[13px] font-semibold text-[#1a4fb3]">{h.provider}</p>
        <p className="text-[12px] text-ink-muted">{h.roomType}</p>
        <div className="mt-auto pt-1.5 flex items-center gap-2">
          <a
            href={h.bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 h-8 rounded-md bg-[#05203c] text-white text-[13px] font-semibold grid place-items-center hover:bg-[#0b2f56]"
          >
            Go to site
          </a>
          <AddToTripButton
            label="Add"
            addedTo={savedTo}
            defaults={{ destination: h.city, startDate: checkIn, endDate: checkOut }}
            onAdd={(tripId) => {
              saveStay(tripId, h, checkIn, checkOut);
              onToast(`Saved to ${useStore.getState().trips.find((t) => t.id === tripId)?.name ?? "trip"}`);
            }}
          />
        </div>
      </div>
    </article>
  );
}

function StaysInner() {
  const params = useSearchParams();
  const ready = useStore((s) => s.ready);
  const trips = useStore((s) => s.trips);
  const presetTrip = trips.find((t) => t.id === params.get("trip"));
  const today = toDay(new Date());

  const init = useMemo<StaySession>(
    () => ({
      q: params.get("q") ?? "",
      checkIn: addDays(toDay(new Date()), 30),
      checkOut: addDays(toDay(new Date()), 33),
      guests: 2,
      hotels: null,
      price: null,
      amenities: [],
      minStars: 0,
      prefilledFor: null,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const session = useSearchStore((s) => s.stay) ?? init;
  const setStay = useSearchStore((s) => s.setStay);
  const set = (patch: Partial<StaySession>) => setStay(patch, init);
  const { q, checkIn, checkOut, guests, hotels, price, amenities, minStars } = session;

  const [loading, setLoading] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const search = async (query: string, extra: Partial<StaySession> = {}) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stays/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setStay({ ...extra, q: query, hotels: data.hotels, price: null, amenities: [], minStars: 0 }, init);
    } finally {
      setLoading(false);
    }
  };

  // Search on arrival only when there's nothing to show yet, or when arriving from a different trip.
  useEffect(() => {
    if (!ready) return;
    const current = useSearchStore.getState().stay;
    if (presetTrip && current?.prefilledFor !== presetTrip.id) {
      void search(params.get("q") ?? presetTrip.destination, {
        checkIn: presetTrip.startDate,
        checkOut: presetTrip.endDate,
        guests: presetTrip.travellers,
        prefilledFor: presetTrip.id,
      });
    } else if (!current?.hotels) {
      void search(params.get("q") ?? current?.q ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, presetTrip?.id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const nights = Math.max(1, daysBetween(checkIn, checkOut));
  const bounds = useMemo(() => {
    if (!hotels?.length) return [0, 0] as [number, number];
    const ps = hotels.map((h) => h.pricePerNight);
    return [Math.floor(Math.min(...ps)), Math.ceil(Math.max(...ps))] as [number, number];
  }, [hotels]);
  const allAmenities = useMemo(() => [...new Set((hotels ?? []).flatMap((h) => h.amenities))].sort(), [hotels]);

  const filtered = (hotels ?? []).filter(
    (h) =>
      (!price || (h.pricePerNight >= price[0] && h.pricePerNight <= price[1])) &&
      amenities.every((a) => h.amenities.includes(a)) &&
      h.stars >= minStars,
  );

  const points: MapPoint[] = filtered.map((h) => ({
    id: h.id,
    lat: h.lat,
    lng: h.lng,
    label: `${h.name} · ${money(h.pricePerNight, h.currency)}`,
    kind: "hotel",
    highlighted: h.id === hover,
  }));

  return (
    <div className="space-y-5">
      <PageTitle>Stays</PageTitle>

      <form
        className="pt-2 flex flex-wrap items-start gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void search(q);
        }}
      >
        <div className="flex flex-wrap items-stretch rounded-[10px] bg-surface border border-white/70 divide-x divide-line/70">
          <input
            aria-label="City, hotel or landmark"
            className="h-11 px-4 w-full sm:w-[340px] bg-transparent outline-none text-[14px] placeholder:text-ink-muted"
            placeholder="Enter a city, hotel or landmark"
            value={q}
            onChange={(e) => set({ q: e.target.value })}
          />
          <label className="flex items-center gap-2 h-11 px-4">
            <CalendarBlank weight="fill" className="size-4 shrink-0" />
            <input aria-label="Check-in" type="date" className={selectCls} value={checkIn} min={today} onChange={(e) => set({ checkIn: e.target.value })} />
            <span className="text-ink-muted">–</span>
            <input aria-label="Check-out" type="date" className={selectCls} value={checkOut} min={addDays(checkIn, 1)} onChange={(e) => set({ checkOut: e.target.value })} />
          </label>
          <label className="flex items-center gap-2 h-11 px-4">
            <span className="text-ink-muted text-[13px]">Guests</span>
            <select aria-label="Guests" className={selectCls} value={guests} onChange={(e) => set({ guests: Number(e.target.value) })}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
        <PrimaryButton type="submit" disabled={loading} className="ml-auto !h-11">
          {loading ? "Searching…" : "Search"}
        </PrimaryButton>
      </form>

      <div className="flex flex-wrap gap-3 items-center">
        <FilterChip label={price ? `${money(price[0])} - ${money(price[1])}` : "Price per night"} active={!!price} onClear={() => set({ price: null })}>
          <PriceRange bounds={bounds} value={price ?? bounds} onChange={(v) => set({ price: v })} />
        </FilterChip>
        <FilterChip label={amenities.length ? `Amenities (${amenities.length})` : "Amenities"} active={amenities.length > 0} onClear={() => set({ amenities: [] })}>
          <div className="space-y-2">
            {allAmenities.map((a) => (
              <label key={a} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-accent"
                  checked={amenities.includes(a)}
                  onChange={(e) => set({ amenities: e.target.checked ? [...amenities, a] : amenities.filter((x) => x !== a) })}
                />
                {a}
              </label>
            ))}
          </div>
        </FilterChip>
        <FilterChip label={minStars ? `${minStars}+ stars` : "Stars"} active={minStars > 0} onClear={() => set({ minStars: 0 })}>
          <div className="space-y-2">
            {[0, 3, 4, 5].map((n) => (
              <label key={n} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="stars" className="accent-accent" checked={minStars === n} onChange={() => set({ minStars: n })} />
                {n ? `${n}+ stars` : "Any"}
              </label>
            ))}
          </div>
        </FilterChip>
        {hotels && (
          <span className="ml-auto text-[13px] text-ink-muted">
            {filtered.length} stays · {nights} night{nights > 1 ? "s" : ""} · demo data
          </span>
        )}
      </div>

      <hr className="border-line" />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="space-y-3 min-w-0">
          {hotels && filtered.length === 0 && <p className="text-ink-muted">No stays found. Try New York, Budapest, London or Paris.</p>}
          {filtered.map((h) => (
            <HotelCard
              key={h.id}
              h={h}
              nights={nights}
              checkIn={checkIn}
              checkOut={checkOut}
              highlighted={hover === h.id}
              onHover={setHover}
              onToast={setToast}
            />
          ))}
        </div>
        <div className="h-[360px] xl:h-[calc(100vh-64px)] xl:sticky xl:top-8 overflow-hidden rounded-[10px]">
          <Map points={points} onPointHover={setHover} />
        </div>
      </div>

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-full bg-ink text-white text-[14px] px-5 py-2 shadow-lg">{toast}</div>}
    </div>
  );
}

export default function StaysPage() {
  return (
    <Suspense>
      <StaysInner />
    </Suspense>
  );
}
