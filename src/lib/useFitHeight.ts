"use client";

import { useLayoutEffect, useRef, useState } from "react";

/**
 * Size a panel to fill the screen below where it starts on the page, so it ends just above the
 * bottom of the window (and above the phone tab bar) without the page scrolling. Used by the
 * trip planner's assistant chat and its itinerary / map, so all three share one height.
 *
 * `minWidth`: only fit at this screen width and up (px); below it the panel keeps its own height.
 * The gap below the panel comes from the --fit-gap CSS variable (see FIT_GAP).
 */
export function useFitHeight<T extends HTMLElement>(minWidth = 0) {
  const ref = useRef<T>(null);
  const [top, setTop] = useState<number | null>(null);
  useLayoutEffect(() => {
    const measure = () => {
      const el = ref.current;
      if (!el || window.innerWidth < minWidth) return setTop(null);
      setTop(Math.round(el.getBoundingClientRect().top + window.scrollY));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  });
  const style = top != null ? { height: `max(380px, calc(100svh - ${top}px - var(--fit-gap)))` } : undefined;
  return [ref, style] as const;
}

/** Classes that set the gap under a fitted panel: room for the phone tab bar, 24px on larger screens. */
export const FIT_GAP = "[--fit-gap:calc(76px+env(safe-area-inset-bottom))] md:[--fit-gap:24px]";
