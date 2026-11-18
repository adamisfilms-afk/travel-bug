"use client";

import { ArrowSquareOut, CalendarBlank, CaretDown, Heart, Star } from "@phosphor-icons/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Map, type MapPoint } from "@/components/Map";
import { PriceRange } from "@/components/PriceRange";
import { AddToTripButton } from "@/components/trips";
import { ButtonLoadingBar, FilterChip, PageTitle, PrimaryButton, useClickOutside } from "@/components/ui";
import { addDays, daysBetween, money, toDay } from "@/lib/format";
import { useSearchStore, type StaySession } from "@/lib/searchStore";
import { useSettings } from "@/lib/settingsStore";
import { useStore } from "@/lib/store";
import type { BookingOption, Hotel } from "@/lib/types";

const selectCls = "bg-transparent outline-none text-[14px] cursor-pointer";

/** "+9 booking options · Cheapest from £40" with a menu of every partner's nightly price. */
function HotelOffers({ options, currency }: { options: BookingOption[]; currency: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));
  const prices = options.map((o) => o.price).filter((p): p is number => p != null);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="w-full mt-1 flex items-center justify-between gap-2 rounded-md bg-surface px-2.5 py-1.5 text-left hover:bg-line/40"
      >
        <span className="text-[11px] leading-tight">
          +{options.length - 1} booking options
          {prices.length > 0 && (
            <span className="block font-semibold">Cheapest from {money(Math.min(...prices), currency)}</span>
          )}
        </span>
        <CaretDown weight="bold" className={`size-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1.5 w-[22rem] rounded-xl bg-surface-strong shadow-lg border border-line py-2 text-[14px]">
          <p className="px-4 py-1 text-xs uppercase tracking-wider text-ink-muted">Price per night</p>
          {options.map((o, i) => (
            <a
              key={i}
              href={o.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2 hover:bg-surface"
            >
              <span className="flex-1 min-w-0">
                <span className="block truncate">{o.name}</span>
                {(o.room || o.terms) && (
                  <span className="block truncate text-[12px] text-ink-muted">{[o.room, o.terms].filter(Boolean).join(" · ")}</span>
                )}
              </span>
              {o.price != null && <span className="font-semibold tabular-nums">{money(o.price, currency)}</span>}
              <ArrowSquareOut className="size-3.5 text-ink-muted shrink-0" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function HotelCard({
  h,
  nights,
  checkIn,
  checkOut,
  guests,
  highlighted,
  onHover,
  onToast,
}: {
  h: Hotel;
  nights: number;
  checkIn: string;
  checkOut: string;
  guests: number;
  highlighted: boolean;
  onHover: (id: string | null) => void;
  onToast: (m: string) => void;
}) {
  const stays = useStore((s) => s.stays);
  const saveStay = useStore((s) => s.saveStay);
  const savedTo = stays.filter((s) => s.hotelId === h.id && s.checkIn === checkIn && s.checkOut === checkOut).map((s) => s.tripId);
  const photos = (h.images ?? []).slice(0, 5);
  const [photo, setPhoto] = useState(0);
  const [imgFailed, setImgFailed] = useState(false);
  const total = h.totalPrice ?? h.pricePerNight * nights;
  return (
    // No overflow-hidden here: the "Add to trip" menu must be able to extend past the card.
    <article
      onMouseEnter={() => onHover(h.id)}
      onMouseLeave={() => onHover(null)}
      className={`relative rounded-xl bg-surface-strong flex flex-col sm:flex-row border-2 transition-colors ${highlighted ? "border-[#3b82f6]" : "border-transparent"}`}
    >
      <div
        className="sm:w-[170px] h-36 sm:h-auto shrink-0 relative overflow-hidden rounded-t-[10px] sm:rounded-tr-none sm:rounded-l-[10px]"
        style={{ background: h.imageColor }}
      >
        {photos.length > 0 && !imgFailed && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photos[photo]}
            alt={h.name}
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="absolute inset-0 size-full object-cover"
          />
        )}
        {photos.length > 1 && !imgFailed && (
          <span className="absolute inset-x-0 bottom-2.5 flex justify-center gap-1">
            {photos.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Photo ${i + 1}`}
                onClick={() => setPhoto(i)}
                className={`size-1.5 rounded-full shadow ${i === photo ? "bg-white" : "bg-white/55 hover:bg-white/80"}`}
              />
            ))}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0 p-3.5 flex flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[16px] font-semibold leading-tight">{h.name}</h3>
          <Heart weight={savedTo.length ? "fill" : "regular"} className={`size-4 shrink-0 ${savedTo.length ? "text-price-up" : "text-ink"}`} aria-label={savedTo.length ? "Saved" : "Not saved"} />
        </div>
        {h.stars > 0 && (
          <div className="flex gap-0.5 text-[#e8604c]" aria-label={`${h.stars} stars`}>
            {Array.from({ length: h.stars }, (_, i) => (
              <Star key={i} weight="fill" className="size-3" />
            ))}
          </div>
        )}
        <p className="text-[13px]">{h.area}</p>
        {h.rating > 0 && (
          <p className="text-[13px]">
            <span className="font-semibold">{h.rating.toFixed(1)}</span>
            <span className="text-ink-muted">/5</span>
            {h.ratingWord && <span className="font-medium"> {h.ratingWord}</span>}
            {h.reviews > 0 && <span className="text-ink-muted"> · {h.reviews.toLocaleString()} reviews</span>}
          </p>
        )}
        {h.tags.length > 0 && <p className="text-[12px] text-ink/70 leading-relaxed">{h.tags.join(" • ")}</p>}
      </div>
      <div className="sm:w-[190px] shrink-0 p-3.5 sm:border-l border-line flex flex-col gap-1">
        {h.originalPricePerNight != null && h.originalPricePerNight > h.pricePerNight + 0.5 && (
          <span className="self-start inline-flex items-center gap-1 rounded-md bg-accent-soft/40 text-accent-ink text-[11px] font-semibold px-1.5 py-0.5">
            {money(h.originalPricePerNight - h.pricePerNight, h.currency)} cheaper
            <span className="font-normal text-ink-muted line-through">{money(h.originalPricePerNight, h.currency)}</span>
          </span>
        )}
        <p>
          <span className="text-[20px] font-bold">{money(h.pricePerNight, h.currency)}</span>
          <span className="text-[13px] text-ink-muted"> a night</span>
        </p>
        <p className="text-[13px] underline">{money(total, h.currency)} total</p>
        <p className="text-[13px] font-semibold text-[#1a4fb3] truncate">{h.provider}</p>
        {h.roomType && <p className="text-[12px] text-ink-muted truncate">{h.roomType}</p>}
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
              saveStay(tripId, h, checkIn, checkOut, guests);
              onToast(`Saved to ${useStore.getState().trips.find((t) => t.id === tripId)?.name ?? "trip"}`);
            }}
          />
        </div>
        {(h.bookingOptions?.length ?? 0) > 1 && <HotelOffers options={h.bookingOptions!} currency={h.currency} />}
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

  const currency = useSettings((s) => s.currency);
  const [loading, setLoading] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const [error, setError] = useState("");
  const [source, setSource] = useState<string>("");

  const search = async (query: string, extra: Partial<StaySession> = {}) => {
    const st = { ...(useSearchStore.getState().stay ?? init), ...extra };
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams({
        q: query,
        checkIn: st.checkIn,
        checkOut: st.checkOut,
        guests: String(st.guests),
        currency: useSettings.getState().currency,
      });
      const res = await fetch(`/api/stays/search?${qs}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Hotel search failed");
      setSource(data.source);
      setStay({ ...extra, q: query, hotels: data.hotels, price: null, amenities: [], minStars: 0 }, init);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hotel search failed");
      setStay({ ...extra, q: query }, init);
    } finally {
      setLoading(false);
    }
  };

  // Search on arrival when coming from a trip ("Find stays"), or when there's a saved query but no
  // results yet. An empty box never searches by itself (live searches cost a credit).
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
    } else if (!current?.hotels && (params.get("q") ?? current?.q)) {
      void search(params.get("q") ?? current!.q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, presetTrip?.id]);

  const staleCurrency = !!hotels?.length && hotels[0].currency !== currency;

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

  const points: MapPoint[] = filtered.filter((h) => h.lat || h.lng).map((h) => ({
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
          if (!loading) void search(q);
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
        <PrimaryButton type="submit" aria-busy={loading} className="ml-auto relative overflow-hidden !h-11">
          {loading ? "Searching…" : "Search"}
          <ButtonLoadingBar progress={loading} />
        </PrimaryButton>
      </form>

      <div className="flex flex-wrap gap-3 items-center">
        <FilterChip
          label={price ? `${money(price[0], currency)} - ${money(price[1], currency)}` : "Price per night"}
          active={!!price}
          onClear={() => set({ price: null })}
        >
          <PriceRange currency={currency} bounds={bounds} value={price ?? bounds} onChange={(v) => set({ price: v })} />
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
            {filtered.length} stays · {nights} night{nights > 1 ? "s" : ""} · {source === "skyscanner" ? "Skyscanner" : "demo data"}
          </span>
        )}
      </div>

      {error && <p className="text-price-up text-[14px]">{error}</p>}
      {staleCurrency && (
        <p className="text-[13px] text-ink-muted">
          These results are in {hotels![0].currency}; your currency is now {currency}.{" "}
          <button type="button" onClick={() => void search(q)} className="text-accent-ink underline underline-offset-2">
            Search again in {currency}
          </button>
        </p>
      )}

      <hr className="border-line" />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="space-y-3 min-w-0">
          {!hotels && !loading && !error && <p className="text-ink-muted">Search for a city, area, hotel or landmark.</p>}
          {loading && !hotels?.length &&
            [0, 1, 2].map((i) => <div key={i} className="h-[170px] rounded-xl bg-surface-strong/70 animate-pulse" />)}
          {hotels && !loading && filtered.length === 0 && (
            <p className="text-ink-muted">
              No stays found{source === "mock" ? ". The demo hotels cover New York, Budapest, London and Paris." : "."}
            </p>
          )}
          {filtered.map((h) => (
            <HotelCard
              key={h.id}
              h={h}
              nights={nights}
              checkIn={checkIn}
              checkOut={checkOut}
              guests={guests}
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
