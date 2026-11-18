"use client";

import dynamic from "next/dynamic";
import type { MapPoint } from "./MapView";

export type { MapPoint };

/** Leaflet touches `window`, so it is only loaded in the browser. */
export const Map = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-[#f2efe6] animate-pulse" />,
});
