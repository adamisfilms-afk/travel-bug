"use client";

import { MapPin } from "@phosphor-icons/react";
import clsx from "clsx";
import { useMemo, useRef, useState } from "react";
import { AIRPORTS } from "@/lib/airports";
import { CITY_GUIDES } from "@/lib/curated/city-guides";
import { useStore } from "@/lib/store";
import { useClickOutside } from "./ui";

type City = { city: string; country: string; note?: string };

/** Cities we know about, without any API call: City Guides, your trips' places and airport cities. */
function useCities(): City[] {
  const trips = useStore((s) => s.trips);
  return useMemo(() => {
    const seen = new Map<string, City>();
    const add = (c: City) => {
      const k = c.city.toLowerCase();
      if (!seen.has(k)) seen.set(k, c);
      else if (c.note && !seen.get(k)!.note) seen.set(k, { ...seen.get(k)!, note: c.note });
    };
    for (const g of CITY_GUIDES) add({ city: g.city, country: g.country, note: "City guide" });
    for (const t of trips) for (const l of t.locations?.length ? t.locations : [t.destination]) if (l) add({ city: l, country: "", note: "Your trip" });
    for (const a of AIRPORTS) add({ city: a.city, country: a.country ?? "" });
    return [...seen.values()];
  }, [trips]);
}

/** A text box for a city, hotel or landmark that suggests matching cities as you type. */
export function CityInput({
  value,
  onChange,
  onPick,
  className,
  inputClassName,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  /** A suggestion was chosen. */
  onPick?: (city: string) => void;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
}) {
  const cities = useCities();
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  const term = value.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!term) return [];
    const starts = cities.filter((c) => c.city.toLowerCase().startsWith(term));
    const contains = cities.filter((c) => !starts.includes(c) && (c.city.toLowerCase().includes(term) || c.country.toLowerCase().startsWith(term)));
    const list = [...starts, ...contains];
    // Nothing to suggest if it's already exactly a known city
    return list.length === 1 && list[0].city.toLowerCase() === term ? [] : list.slice(0, 7);
  }, [cities, term]);

  const pick = (c: City) => {
    onChange(c.city);
    onPick?.(c.city);
    setOpen(false);
  };

  return (
    <div ref={ref} className={clsx("relative", className)}>
      <input
        aria-label="City, hotel or landmark"
        autoComplete="off"
        className={inputClassName}
        placeholder={placeholder}
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHi(0);
        }}
        onKeyDown={(e) => {
          if (!open || !matches.length) return;
          if (e.key === "ArrowDown") (e.preventDefault(), setHi((h) => Math.min(h + 1, matches.length - 1)));
          else if (e.key === "ArrowUp") (e.preventDefault(), setHi((h) => Math.max(h - 1, 0)));
          else if (e.key === "Enter" || e.key === "Tab") {
            if (e.key === "Enter") e.preventDefault();
            pick(matches[hi]);
          } else if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && matches.length > 0 && (
        <div className="absolute left-0 top-full mt-2 z-40 w-full min-w-64 rounded-xl bg-surface-strong shadow-lg border border-line py-1.5 text-[14px]">
          {matches.map((c, i) => (
            <button
              key={c.city}
              type="button"
              onMouseEnter={() => setHi(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(c)}
              className={clsx("w-full text-left px-4 py-2 flex items-center gap-2.5", i === hi && "bg-surface")}
            >
              <MapPin className="size-4 text-ink-muted shrink-0" />
              <span className="min-w-0 truncate">
                <span className="font-medium">{c.city}</span>
                {c.country && <span className="text-ink-muted"> · {c.country}</span>}
              </span>
              {c.note && <span className="ml-auto shrink-0 text-[12px] text-ink-muted">{c.note}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
