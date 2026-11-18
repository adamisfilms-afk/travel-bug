"use client";

import { Airplane, AirplaneTakeoff, Bed, Clock, ForkKnife, MaskHappy, Mountains, ShoppingBag, Star, Users, Train } from "@phosphor-icons/react";
import clsx from "clsx";
import { useState } from "react";
import { daysBetween, hhmm } from "@/lib/format";
import type { ActivityCategory, FlightLeg, ItineraryItem, SavedActivity, SavedFlight, SavedStay } from "@/lib/types";
import { Pill } from "./ui";

export const CATEGORY_ICON: Record<ActivityCategory, typeof Star> = {
  sight: Star,
  food: ForkKnife,
  show: MaskHappy,
  outdoors: Mountains,
  shopping: ShoppingBag,
  travel: Train,
  other: Star,
};

export interface Lookup {
  flights: Map<string, SavedFlight>;
  stays: Map<string, SavedStay>;
  activities: Map<string, SavedActivity>;
}

export function makeLookup(flights: SavedFlight[], stays: SavedStay[], activities: SavedActivity[]): Lookup {
  return {
    flights: new Map(flights.map((f) => [f.id, f])),
    stays: new Map(stays.map((s) => [s.id, s])),
    activities: new Map(activities.map((a) => [a.id, a])),
  };
}

/** The leg of a flight that departs on the given day (falls back to the first leg). */
export function legForDay(f: SavedFlight, day: string): FlightLeg {
  return f.legs.find((l) => l.depart.startsWith(day)) ?? f.legs[0];
}

export function TimePill({
  time,
  icon = "clock",
  editable,
  onChange,
}: {
  time: string | null;
  icon?: "clock" | "plane";
  editable?: boolean;
  onChange?: (t: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const Icon = icon === "plane" ? AirplaneTakeoff : Clock;
  if (editing && editable) {
    return (
      <input
        type="time"
        autoFocus
        defaultValue={time ?? ""}
        onPointerDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setEditing(false);
        }}
        onBlur={(e) => {
          onChange?.(e.target.value || null);
          setEditing(false);
        }}
        className="h-6 w-[84px] rounded-full bg-white border border-accent-soft px-2 text-[12px] outline-none"
      />
    );
  }
  const content = (
    <>
      <Icon className="size-3" />
      {time ?? "--:--"}
    </>
  );
  if (!editable) return time ? <Pill>{content}</Pill> : <span className="inline-block w-[70px]" />;
  return (
    <button
      type="button"
      title="Set time"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={() => setEditing(true)}
      className={clsx(
        "inline-flex items-center gap-1.5 h-6 px-2 rounded-full bg-surface border text-[12px] tabular-nums hover:border-accent-soft",
        time ? "border-line/60 text-ink/70" : "border-dashed border-line text-ink-muted",
      )}
    >
      {content}
    </button>
  );
}

/** Shared column layout so timed and untimed entries line up: [time pill][icon][text]. */
export const ENTRY_GRID = "grid grid-cols-[76px_18px_minmax(0,1fr)] gap-x-2.5 items-start";

function FlightBlock({ leg }: { leg: FlightLeg }) {
  return (
    <div className="grid grid-cols-[18px_minmax(0,1fr)] gap-x-3 mt-3">
      <div className="flex flex-col items-center pt-1 text-ink/60">
        <span className="size-3 rounded-full border-2 border-dotted border-ink/50" />
        <span className="w-px flex-1 border-l border-dashed border-ink/40 my-1 min-h-2.5" />
        <Airplane weight="fill" className="size-3.5 rotate-180" />
        <span className="w-px flex-1 border-l border-dashed border-ink/40 my-1 min-h-2.5" />
        <span className="size-3 rounded-full border-[3px] border-ink/70 bg-white" />
      </div>
      <div className="flex flex-col gap-3.5 min-w-0">
        <div>
          <p className="font-semibold text-[15px] leading-tight">{leg.from.city}</p>
          <p className="text-ink-muted text-[13px] truncate">
            {leg.from.name} ({leg.from.code}) · {hhmm(leg.depart)}
          </p>
        </div>
        <div>
          <p className="font-semibold text-[15px] leading-tight">{leg.to.city}</p>
          <p className="text-ink-muted text-[13px] truncate">
            {leg.to.name} ({leg.to.code}) · {hhmm(leg.arrive)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function ItineraryEntry({
  item,
  lookup,
  editable,
  onTime,
}: {
  item: ItineraryItem;
  lookup: Lookup;
  editable?: boolean;
  onTime?: (t: string | null) => void;
}) {
  if (item.kind === "flight") {
    const f = lookup.flights.get(item.refId);
    if (!f) return null;
    const leg = legForDay(f, item.day);
    return (
      <div>
        <div className="flex flex-wrap items-center gap-1.5">
          <TimePill icon="plane" time={item.time} editable={editable} onChange={onTime} />
          <Pill>
            <Users className="size-3" />
            {f.passengers} passenger{f.passengers === 1 ? "" : "s"}
          </Pill>
          <Pill>{leg.flightNumber}</Pill>
        </div>
        <FlightBlock leg={leg} />
      </div>
    );
  }

  let Icon: typeof Star = Star;
  let name = "";
  let sub: string | null = null;
  if (item.kind === "stay") {
    const s = lookup.stays.get(item.refId);
    if (!s) return null;
    name = s.name;
    const nights = daysBetween(s.checkIn, s.checkOut);
    sub =
      item.day === s.checkIn
        ? `Check-in · ${nights} night${nights === 1 ? "" : "s"}`
        : item.day === s.checkOut
          ? "Check-out"
          : s.area;
    Icon = Bed;
  } else {
    const a = lookup.activities.get(item.refId);
    if (!a) return null;
    name = a.name;
    Icon = CATEGORY_ICON[a.category] ?? Star;
    sub = a.place && a.place !== a.name ? a.place : null;
  }

  // Row 1: [time pill or blank][icon][name] all centred on a 24px line; row 2: sub-text under the name.
  return (
    <div className={ENTRY_GRID}>
      <div className="h-6 flex items-center">
        {(editable || item.time) && <TimePill time={item.time} editable={editable} onChange={onTime} />}
      </div>
      <div className="h-6 flex items-center justify-center text-ink/45">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-[15px] leading-6 truncate">{name}</p>
        {sub && <p className="text-ink-muted text-[13px] leading-tight">{sub}</p>}
      </div>
    </div>
  );
}
