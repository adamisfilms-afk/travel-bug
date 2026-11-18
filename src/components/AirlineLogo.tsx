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
