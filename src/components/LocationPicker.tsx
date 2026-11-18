"use client";

import { MagnifyingGlass, MapPin, X } from "@phosphor-icons/react";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import type { SavedActivity } from "@/lib/types";
import { useClickOutside } from "./ui";

interface PlaceResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

/**
 * Pin button for an itinerary event: grey without a location, green with one. Opens a
 * search to pick a place; the coordinates then put the event on the trip map.
 */
export function LocationPicker({
  activity,
  near,
  onPick,
}: {
  activity: SavedActivity;
  /** Bias results towards the trip's area. */
  near?: { lat: number; lng: number } | null;
  onPick: (loc: { place: string; lat: number; lng: number } | null) => void;
}) {
  const has = activity.lat != null && activity.lng != null;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PlaceResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  // Debounced search as you type
  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length < 2) {
      setResults(null);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const qs = new URLSearchParams({ q: term });
        if (near) qs.set("near", `${near.lat},${near.lng}`);
        const res = await fetch(`/api/places/search?${qs}`, { signal: ctrl.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Place search failed");
        setResults(data.results);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, open, near]);

  return (
    <div ref={ref} className="relative" onPointerDown={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-label={has ? `Location: ${activity.place ?? "set"} (change)` : "Add a location"}
        title={has ? activity.place ?? "Location set" : "Add a location"}
        onClick={() => {
          setOpen((o) => !o);
          setQ(open ? q : activity.place ? "" : activity.name);
        }}
        className={clsx(
          "grid place-items-center size-7 rounded-full transition-colors",
          has ? "text-accent hover:bg-accent-soft/30" : "text-ink/30 hover:text-ink/60 hover:bg-line/40",
        )}
      >
        <MapPin weight="fill" className="size-4" />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1.5 w-80 rounded-xl bg-surface-strong shadow-lg border border-line p-3 text-[14px] cursor-auto">
          <label className="flex items-center gap-2 h-10 rounded-lg bg-surface px-3">
            <MagnifyingGlass className="size-4 text-ink-muted shrink-0" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Escape") setOpen(false);
                if (e.key === "Enter" && results?.[0]) {
                  const r = results[0];
                  onPick({ place: r.name, lat: r.lat, lng: r.lng });
                  setOpen(false);
                }
              }}
              placeholder="Search for a place or address"
              className="flex-1 min-w-0 bg-transparent outline-none text-[14px]"
            />
          </label>
          {has && (
            <div className="mt-2 flex items-center gap-2 text-[12px] text-ink-muted">
              <MapPin weight="fill" className="size-3.5 text-accent shrink-0" />
              <span className="flex-1 truncate">{activity.place ?? "Location set"}</span>
              <button
                type="button"
                onClick={() => {
                  onPick(null);
                  setOpen(false);
                }}
                className="inline-flex items-center gap-0.5 hover:text-price-up"
              >
                <X className="size-3" /> Remove
              </button>
            </div>
          )}
          <div className="mt-2 max-h-64 overflow-auto -mx-1">
            {loading && <p className="px-2 py-1.5 text-[13px] text-ink-muted">Searching…</p>}
            {error && <p className="px-2 py-1.5 text-[13px] text-price-up">{error}</p>}
            {!loading && results?.length === 0 && <p className="px-2 py-1.5 text-[13px] text-ink-muted">No places found.</p>}
            {results?.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  onPick({ place: r.name, lat: r.lat, lng: r.lng });
                  setOpen(false);
                }}
                className="w-full text-left rounded-lg px-2 py-1.5 hover:bg-surface"
              >
                <span className="block font-medium truncate">{r.name}</span>
                <span className="block text-[12px] text-ink-muted truncate">{r.address}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
