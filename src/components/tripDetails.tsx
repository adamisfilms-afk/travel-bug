"use client";

import { Bed, CaretLeft, CaretRight, Star } from "@phosphor-icons/react";
import { useState } from "react";
import { FlightPath } from "@/components/FlightPath";
import { daysBetween, money, shortDate } from "@/lib/format";
import type { SavedFlight, SavedStay } from "@/lib/types";

/* Expanded details for saved flights and stays (trip planner rows, shared itineraries). */

/** Expanded flight row: each leg's route with stopovers, plus booking facts. */
export function FlightDetails({ f }: { f: SavedFlight }) {
  const cabin = { economy: "Economy", premium_economy: "Premium economy", business: "Business", first: "First" }[f.cabin];
  return (
    <div className="space-y-3">
      <div className="grid gap-6 md:grid-cols-2">
        {f.legs.map((leg, i) => (
          <FlightPath key={i} leg={leg} label={i === 0 ? "Outbound" : "Return"} />
        ))}
      </div>
      <p className="text-[12px] text-ink-muted">
        {f.passengers} passenger{f.passengers === 1 ? "" : "s"} · {cabin} · saved at {money(f.priceSaved, f.currency)} on {shortDate(f.savedAt.slice(0, 10))}
      </p>
    </div>
  );
}

/** Expanded stay row: photos, stars, rating, room, dates — like a card on the Stays page. */
export function StayDetails({ s }: { s: SavedStay }) {
  const photos = (s.images?.length ? s.images : s.imageUrl ? [s.imageUrl] : []).slice(0, 10);
  const [photo, setPhoto] = useState(0);
  const [imgFailed, setImgFailed] = useState(false);
  const nights = Math.max(1, daysBetween(s.checkIn, s.checkOut));
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="group/photo relative w-full sm:w-[220px] h-36 shrink-0 overflow-hidden rounded-lg bg-[#d3c2b0]">
        {photos.length > 0 && !imgFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photos[photo]} alt={s.name} onError={() => setImgFailed(true)} className="absolute inset-0 size-full object-cover" />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-ink/25">
            <Bed className="size-10" />
          </span>
        )}
        {photos.length > 1 && !imgFailed && (
          <>
            {(["prev", "next"] as const).map((dir) => (
              <button
                key={dir}
                type="button"
                aria-label={dir === "prev" ? "Previous photo" : "Next photo"}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setPhoto((i) => (dir === "next" ? (i + 1) % photos.length : (i - 1 + photos.length) % photos.length))}
                className={`absolute top-1/2 -translate-y-1/2 ${dir === "prev" ? "left-1.5" : "right-1.5"} grid place-items-center size-7 rounded-full bg-white/90 shadow opacity-0 group-hover/photo:opacity-100 transition-opacity`}
              >
                {dir === "prev" ? <CaretLeft weight="bold" className="size-3.5" /> : <CaretRight weight="bold" className="size-3.5" />}
              </button>
            ))}
            <span className="absolute top-1.5 right-1.5 rounded-full bg-ink/60 text-white text-[10px] px-1.5 py-0.5 tabular-nums">
              {photo + 1}/{photos.length}
            </span>
          </>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1 text-[13px]">
        {!!s.stars && (
          <div className="flex gap-0.5 text-[#e8604c]" aria-label={`${s.stars} stars`}>
            {Array.from({ length: s.stars }, (_, i) => (
              <Star key={i} weight="fill" className="size-3" />
            ))}
          </div>
        )}
        <p>{s.area}</p>
        {!!s.rating && (
          <p>
            <span className="font-semibold">{s.rating.toFixed(1)}</span>
            <span className="text-ink-muted">/5</span>
            {s.ratingWord && <span className="font-medium"> {s.ratingWord}</span>}
            {!!s.reviews && <span className="text-ink-muted"> · {s.reviews.toLocaleString()} reviews</span>}
          </p>
        )}
        <p className="text-ink-muted">
          Check-in {shortDate(s.checkIn)} · Check-out {shortDate(s.checkOut)} · {nights} night{nights === 1 ? "" : "s"}
          {s.guests ? ` · ${s.guests} guest${s.guests === 1 ? "" : "s"}` : ""}
        </p>
        {(s.roomType || s.provider) && <p className="text-ink-muted">{[s.roomType, s.provider && `via ${s.provider}`].filter(Boolean).join(" · ")}</p>}
        {!!s.amenities?.length && <p className="text-[12px] text-ink/70">{s.amenities.slice(0, 8).join(" • ")}</p>}
        {!s.images && !s.stars && !s.rating && !!s.priceSaved && (
          <p className="text-[12px] text-ink-muted">Saved before hotel details were kept — save it again from Stays to see photos and ratings.</p>
        )}
        <p className="text-[12px] text-ink-muted pt-1">
          {s.priceSaved ? `Saved at ${money(s.priceSaved, s.currency)} for the stay` : "No price yet — Refresh prices looks it up for your dates."}
        </p>
      </div>
    </div>
  );
}

