"use client";

import { AirplaneTilt } from "@phosphor-icons/react";
import { useState } from "react";
import type { FlightLeg } from "@/lib/types";

/**
 * Airline symbol mark (the text-free tail/wingtip logo), transparent background.
 * Google Flights' logo set is symbol-only, unlike provider logos that include the wordmark.
 * Falls back to a muted plane glyph if the image can't load.
 */
export function AirlineLogo({ leg, size = 22 }: { leg: Pick<FlightLeg, "carrierCode" | "flightNumber" | "carrier">; size?: number }) {
  const code = (leg.carrierCode || leg.flightNumber.split(" ")[0] || "").toUpperCase();
  const [failed, setFailed] = useState(false);

  if (!code || failed) {
    return <AirplaneTilt aria-hidden weight="fill" className="shrink-0 text-ink/30" style={{ width: size * 0.8, height: size * 0.8, margin: size * 0.1 }} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://www.gstatic.com/flights/airline_logos/70px/${code}.png`}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className="shrink-0 object-contain"
      style={{ width: size, height: size }}
    />
  );
}

type Carrier = { carrier: string; carrierCode?: string; flightNumber: string };

/** Distinct airlines flying a leg, in order (from its segments when known). */
export function carriersOf(leg: FlightLeg): Carrier[] {
  const list: Carrier[] = leg.segments?.length ? leg.segments : [leg];
  const seen = new Set<string>();
  return list.filter((c) => {
    const key = (c.carrierCode || c.carrier).toUpperCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** "easyJet", or "easyJet + 1" when other airlines fly part of the leg. */
export function carrierLabel(leg: FlightLeg) {
  const list = carriersOf(leg);
  return list.length > 1 ? `${list[0].carrier} + ${list.length - 1}` : list[0].carrier;
}

/**
 * Airline logos for a leg. Several airlines are stacked like overlapping cards
 * (each offset and slightly shadowed so every logo stays recognisable).
 */
export function AirlineStack({ leg, size = 22 }: { leg: FlightLeg; size?: number }) {
  const list = carriersOf(leg).slice(0, 3);
  if (list.length === 1) return <AirlineLogo leg={list[0]} size={size} />;
  const step = Math.round(size * 0.45);
  return (
    <span
      className="relative inline-block shrink-0"
      style={{ width: size + step * (list.length - 1), height: size }}
      title={carriersOf(leg).map((c) => c.carrier).join(", ")}
    >
      {list.map((c, i) => (
        <span
          key={i}
          className="absolute top-0 [filter:drop-shadow(0_0_1px_rgba(0,0,0,0.35))_drop-shadow(1px_1px_1px_rgba(0,0,0,0.15))]"
          // first airline on top, later ones peeking out behind it
          style={{ left: i * step, zIndex: list.length - i, transform: `translateY(${i * 1.5}px) scale(${1 - i * 0.06})` }}
        >
          <AirlineLogo leg={c} size={size} />
        </span>
      ))}
    </span>
  );
}
