"use client";

import { useState } from "react";
import type { FlightLeg } from "@/lib/types";

const BADGE_COLORS = ["#3c6fb0", "#a35f5f", "#5e9a50", "#8a6bb0", "#b08a3c", "#3c9aa0", "#6b6f78"];

function codeOf(leg: Pick<FlightLeg, "carrierCode" | "flightNumber">) {
  return (leg.carrierCode || leg.flightNumber.split(" ")[0] || "").toUpperCase();
}

/**
 * Small airline logo. Uses the provider's logo (Skyscanner returns one per carrier),
 * otherwise a public logo CDN keyed by IATA code, and falls back to a coloured code badge.
 */
export function AirlineLogo({ leg, size = 18 }: { leg: Pick<FlightLeg, "carrierCode" | "carrierLogo" | "flightNumber" | "carrier">; size?: number }) {
  const code = codeOf(leg);
  const sources = [leg.carrierLogo, code && `https://pics.avs.io/64/64/${code}.png`].filter(Boolean) as string[];
  const [failed, setFailed] = useState(0);

  if (failed >= sources.length) {
    let h = 0;
    for (const c of code) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return (
      <span
        aria-hidden
        className="inline-grid place-items-center shrink-0 rounded-full text-white font-semibold"
        style={{ width: size, height: size, fontSize: size * 0.42, background: BADGE_COLORS[h % BADGE_COLORS.length] }}
      >
        {code.slice(0, 2)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={sources[failed]}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed((n) => n + 1)}
      className="shrink-0 rounded-[4px] bg-white object-contain"
      style={{ width: size, height: size }}
    />
  );
}
