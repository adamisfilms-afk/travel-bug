"use client";

import { ArrowSquareOut, CalendarBlank, Clock, Phone, Users } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { tripLocations } from "@/components/trips";
import { bookingLink, canPrefill, providerOf } from "@/lib/booking";
import type { CuratedGuide } from "@/lib/curated/types";
import { addDays, toDay } from "@/lib/format";
import { useStore } from "@/lib/store";

const TIMES = ["12:00", "12:30", "13:00", "13:30", "14:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00"];

/** Booking links found on restaurants' websites this session (by website). */
const found = new Map<string, { url: string | null; provider: string | null }>();

const field = "h-9 rounded-lg bg-white/80 px-2.5 text-[14px] border border-black/10 outline-none focus:border-ink/30";

/**
 * "Book a table" for a restaurant: pick a date, time and party size, then open its booking
 * system on that slot (OpenTable, Resy, SevenRooms, Tock pre-fill; others open their page).
 * The booking link is the curator's, or one found on the restaurant's website; failing that,
 * the website or phone number. Defaults come from your next trip to this city.
 */
export function BookTable({
  placeName,
  bookingUrl,
  website,
  phone,
  reservable,
  guide,
}: {
  placeName: string;
  bookingUrl?: string | null;
  website?: string | null;
  phone?: string | null;
  reservable?: boolean | null;
  guide: CuratedGuide;
}) {
  // Defaults from your next trip to this city (its start date and number of travellers)
  const trips = useStore((s) => s.trips);
  const today = toDay(new Date());
  const trip = useMemo(() => {
    const city = guide.city.toLowerCase();
    const names = [city, ...guide.aliases];
    return trips
      .filter((t) => t.endDate >= today && tripLocations(t).some((l) => names.some((n) => l.toLowerCase().includes(n) || n.includes(l.toLowerCase()))))
      .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  }, [trips, guide, today]);
  const [date, setDate] = useState(() => (trip && trip.startDate >= today ? trip.startDate : addDays(today, 1)));
  const [time, setTime] = useState("19:30");
  const [party, setParty] = useState(trip?.travellers ?? 2);
  useEffect(() => {
    if (!trip) return;
    setDate(trip.startDate >= today ? trip.startDate : addDays(today, 1));
    setParty(trip.travellers);
  }, [trip, today]);

  // The restaurant's own booking system, found on its website (unless the curator set a link)
  const [discovered, setDiscovered] = useState<{ url: string | null; provider: string | null } | null>(() => (website ? found.get(website) ?? null : null));
  useEffect(() => {
    if (bookingUrl || !website) return;
    if (found.has(website)) return setDiscovered(found.get(website)!);
    let cancelled = false;
    fetch(`/api/curated/booking?website=${encodeURIComponent(website)}`)
      .then((r) => (r.ok ? r.json() : { url: null, provider: null }))
      .then((d) => {
        found.set(website, d);
        if (!cancelled) setDiscovered(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [bookingUrl, website]);

  const link = bookingUrl || discovered?.url || null;
  const provider = providerOf(link);
  const prefill = canPrefill(link);
  const looking = !bookingUrl && !!website && discovered === null;
  const walkIn = reservable === false && !link;

  const go = link ? bookingLink(link, { date, time, party }) : website;
  const when = new Date(`${date}T12:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

  return (
    <section className="rounded-2xl bg-black/[0.04] p-4 sm:p-5 space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="font-serif text-[21px] leading-tight">Book a table</h3>
        {trip && <span className="text-[12px] text-ink-muted">For your {trip.name} trip</span>}
      </div>

      {walkIn ? (
        <p className="text-[14px] text-ink-muted">Google lists {placeName} as walk-in only — no reservations needed.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <label className="flex items-center gap-1.5">
              <CalendarBlank className="size-4 text-ink-muted" />
              <input type="date" aria-label="Date" value={date} min={today} onChange={(e) => setDate(e.target.value)} className={field} />
            </label>
            <label className="flex items-center gap-1.5">
              <Clock className="size-4 text-ink-muted" />
              <select aria-label="Time" value={time} onChange={(e) => setTime(e.target.value)} className={field}>
                {TIMES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1.5">
              <Users className="size-4 text-ink-muted" />
              <select aria-label="People" value={party} onChange={(e) => setParty(Number(e.target.value))} className={field}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "person" : "people"}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {go ? (
              <a
                href={go}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-accent text-white text-[14px] hover:bg-accent-hover"
              >
                {provider ? (prefill ? `Find a table on ${provider.name}` : `Book on ${provider.name}`) : "Book on their website"}
                <ArrowSquareOut className="size-4" />
              </a>
            ) : looking ? (
              <span className="h-10 w-48 rounded-full bg-black/5 animate-pulse" />
            ) : null}
            {phone && (
              <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1.5 text-[14px] underline underline-offset-2">
                <Phone className="size-4" /> Call {phone}
              </a>
            )}
          </div>

          <p className="text-[12px] text-ink-muted">
            {looking
              ? "Looking for their booking page…"
              : prefill
                ? `Opens ${provider!.name} for ${when} at ${time}, ${party} ${party === 1 ? "person" : "people"} — you'll see what's available there.`
                : provider
                  ? `Bookings are on ${provider.name} — choose ${when}, ${time} for ${party} there.`
                  : go
                    ? "We couldn't find an online booking system — their website may have one, or call them."
                    : phone
                      ? "No online booking found — call to reserve."
                      : "No online booking found for this place."}
          </p>
        </>
      )}
    </section>
  );
}
