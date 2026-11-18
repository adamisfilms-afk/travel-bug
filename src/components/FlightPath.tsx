"use client";

import { Airplane, Clock, Warning } from "@phosphor-icons/react";
import clsx from "clsx";
import { durationLabel, hhmm, longDay } from "@/lib/format";
import type { FlightLeg, FlightSegment } from "@/lib/types";
import { AirlineLogo } from "./AirlineLogo";

/** Minutes between two local timestamps at the same airport ("2026-12-23T10:05"). */
function minutesBetween(a: string, b: string) {
  return Math.round((Date.parse(b + ":00Z") - Date.parse(a + ":00Z")) / 60_000);
}

/** Days after the leg's departure date, for "+1" markers on overnight arrivals. */
function dayOffset(start: string, t: string) {
  return Math.round((Date.parse(t.slice(0, 10)) - Date.parse(start.slice(0, 10))) / 86_400_000);
}

function segmentsOf(leg: FlightLeg): FlightSegment[] {
  if (leg.segments?.length) return leg.segments;
  return [
    {
      from: leg.from,
      to: leg.to,
      depart: leg.depart,
      arrive: leg.arrive,
      carrier: leg.carrier,
      carrierCode: leg.carrierCode,
      flightNumber: leg.flightNumber,
      durationMins: leg.stops ? 0 : leg.durationMins,
    },
  ];
}

const GRID = "grid grid-cols-[52px_20px_minmax(0,1fr)] gap-x-3";

function Time({ t, start }: { t: string; start: string }) {
  const d = dayOffset(start, t);
  return (
    <span className="text-right tabular-nums font-semibold text-[14px] leading-6">
      {hhmm(t)}
      {d > 0 && <sup className="ml-0.5 text-[10px] font-medium text-price-up">+{d}</sup>}
    </span>
  );
}

function Stop({ t, start, place, kind }: { t: string; start: string; place: FlightSegment["from"]; kind: "start" | "end" | "mid" }) {
  return (
    <div className={GRID}>
      <Time t={t} start={start} />
      <span className="flex justify-center pt-[7px]">
        <span
          className={clsx(
            "size-2.5 rounded-full",
            kind === "start" && "border-2 border-dotted border-ink/60",
            kind === "end" && "border-[3px] border-ink/70 bg-white",
            kind === "mid" && "bg-ink/50",
          )}
        />
      </span>
      <span className="text-[14px] leading-6 truncate">
        <span className="font-medium">{place.name}</span> <span className="text-ink-muted">({place.code})</span>
      </span>
    </div>
  );
}

/** One leg drawn as a vertical path: each flight with airline and duration, layovers between them. */
export function FlightPath({ leg, label }: { leg: FlightLeg; label: string }) {
  const segs = segmentsOf(leg);
  const missingStops = leg.stops > 0 && !leg.segments?.length;
  return (
    <div className="min-w-0">
      <p className="text-[13px] mb-2">
        <span className="font-semibold">{label}</span>
        <span className="text-ink-muted">
          {" "}
          · {longDay(leg.depart.slice(0, 10))} · {durationLabel(leg.durationMins)} ·{" "}
          {leg.stops ? `${leg.stops} stop${leg.stops > 1 ? "s" : ""}` : "Direct"}
        </span>
      </p>
      <div>
        {segs.map((sg, i) => {
          const next = segs[i + 1];
          const layover = next ? minutesBetween(sg.arrive, next.depart) : 0;
          const changeAirport = next && next.from.code !== sg.to.code;
          return (
            <div key={i}>
              <Stop t={sg.depart} start={leg.depart} place={sg.from} kind={i === 0 ? "start" : "mid"} />
              {/* flight */}
              <div className={GRID}>
                <span />
                <span className="flex flex-col items-center py-0.5 text-ink/50">
                  <span className="w-px flex-1 border-l border-dashed border-ink/40" />
                  <Airplane weight="fill" className="size-3.5 rotate-180 my-0.5" />
                  <span className="w-px flex-1 border-l border-dashed border-ink/40" />
                </span>
                <span className="flex items-center gap-2 py-2 text-[13px] text-ink-muted min-w-0">
                  <AirlineLogo leg={sg} size={20} />
                  <span className="text-ink truncate">{sg.carrier}</span>
                  <span>· {sg.flightNumber}</span>
                  {sg.durationMins > 0 && <span>· {durationLabel(sg.durationMins)}</span>}
                </span>
              </div>
              <Stop t={sg.arrive} start={leg.depart} place={sg.to} kind={next ? "mid" : "end"} />
              {next && (
                <div className={GRID}>
                  <span />
                  <span className="flex justify-center">
                    <span className="w-px h-full border-l-2 border-dotted border-ink/25" />
                  </span>
                  <span className="py-2">
                    <span
                      className={clsx(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 h-6 text-[12px]",
                        changeAirport ? "bg-price-up/10 text-price-up" : "bg-ph-lime/50 text-ink/80",
                      )}
                    >
                      {changeAirport ? <Warning className="size-3.5" /> : <Clock className="size-3.5" />}
                      {layover > 0 ? `${durationLabel(layover)} layover` : "Layover"} in {sg.to.city || sg.to.name}
                      {changeAirport && ` · change to ${next.from.name} (${next.from.code})`}
                    </span>
                  </span>
                </div>
              )}
            </div>
          );
        })}
        {missingStops && (
          <p className="text-[12px] text-ink-muted mt-1 pl-[84px]">The provider didn&apos;t include stopover details for this flight.</p>
        )}
      </div>
    </div>
  );
}
