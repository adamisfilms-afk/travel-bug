"use client";

import { Airplane, AirplaneTakeoff, Bed, Clock, ForkKnife, MaskHappy, Mountains, ShoppingBag, Star, Users } from "@phosphor-icons/react";
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
        className="h-7 w-[92px] rounded-full bg-white border border-accent-soft px-2 text-[13px] outline-none"
      />
    );
  }
  const content = (
    <>
      <Icon className="size-3.5" />
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
        "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-surface border text-[13px] tabular-nums hover:border-accent-soft",
        time ? "border-line/60 text-ink/70" : "border-dashed border-line text-ink-muted",
      )}
    >
      {content}
    </button>
  );
}

function FlightBlock({ leg }: { leg: FlightLeg }) {
  return (
    <div className="grid grid-cols-[28px_1fr] gap-x-4 mt-4">
      <div className="flex flex-col items-center pt-1.5 text-ink/60">
        <span className="size-3.5 rounded-full border-2 border-dotted border-ink/50" />
        <span className="w-px flex-1 border-l border-dashed border-ink/40 my-1 min-h-3" />
        <Airplane weight="fill" className="size-4 rotate-180" />
        <span className="w-px flex-1 border-l border-dashed border-ink/40 my-1 min-h-3" />
        <span className="size-3.5 rounded-full border-[3px] border-ink/70 bg-white" />
      </div>
      <div className="flex flex-col gap-5">
        <div>
          <p className="font-semibold text-[19px] leading-tight">{leg.from.city}</p>
          <p className="text-ink-muted text-[16px]">
            {leg.from.name} ({leg.from.code}) · {hhmm(leg.depart)}
          </p>
        </div>
        <div>
          <p className="font-semibold text-[19px] leading-tight">{leg.to.city}</p>
          <p className="text-ink-muted text-[16px]">
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
        <div className="flex flex-wrap items-center gap-2">
          <TimePill icon="plane" time={item.time} editable={editable} onChange={onTime} />
          <Pill>
            <Users className="size-3.5" />
            {f.passengers} passenger{f.passengers === 1 ? "" : "s"}
          </Pill>
          <Pill>{leg.flightNumber}</Pill>
        </div>
        <FlightBlock leg={leg} />
      </div>
    );
  }

  let icon = <Star className="size-4" />;
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
    icon = <Bed className="size-4" />;
  } else {
    const a = lookup.activities.get(item.refId);
    if (!a) return null;
    name = a.name;
    const Icon = CATEGORY_ICON[a.category];
    icon = <Icon className="size-4" />;
  }

  return (
    <div className="grid grid-cols-[96px_1fr] items-center gap-3">
      <div className="flex justify-start">
        {editable || item.time ? (
          <TimePill time={item.time} editable={editable} onChange={onTime} />
        ) : (
          <span className="ml-14 text-ink/40">{icon}</span>
        )}
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-[19px] leading-tight truncate flex items-center gap-2">
          {(editable || item.time) && <span className="text-ink/40 shrink-0">{icon}</span>}
          {name}
        </p>
        {sub && <p className="text-ink-muted text-[14px]">{sub}</p>}
      </div>
    </div>
  );
}
