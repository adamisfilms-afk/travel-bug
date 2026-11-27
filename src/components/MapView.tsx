"use client";

import L from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  label: string;
  kind: "flight" | "stay" | "activity" | "hotel" | "guide";
  highlighted?: boolean;
  /** Short text shown instead of a pin, e.g. a nightly price ("£75"). */
  badge?: string;
  /** Marker shape: map pin (default) or a circle (itinerary events). */
  shape?: "pin" | "circle";
  /** On the trip's itinerary (green) or only saved (grey). Undefined = use the kind's colour. */
  scheduled?: boolean;
  /** Visit order on the itinerary; points with an order are joined by the route line. */
  order?: number;
  /** Optional sequence number shown inside the pin. */
  n?: number;
  /** The saved item this point belongs to ("flight:<id>", "stay:<id>", "activity:<id>"), for hover highlighting. */
  ref?: string;
}

const KIND_COLOR: Record<MapPoint["kind"], string> = {
  flight: "#3c6fb0",
  stay: "#111111",
  hotel: "#111111",
  activity: "#274321",
  guide: "#151f15",
};

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Price label marker; positioned by CSS (.tb-price) so its size follows the text. */
function badgeIcon(p: MapPoint) {
  return L.divIcon({
    className: "tb-price-pin",
    iconSize: undefined,
    html: `<div class="tb-price">${esc(p.badge!)}</div>`,
  });
}

const GREEN = "#274321";
const GREY = "#9a9d97";

/** Circle marker for events: green and numbered when on the itinerary, hollow grey when not. */
function circleIcon(p: MapPoint) {
  const size = p.n != null ? 24 : 18;
  const on = p.scheduled !== false;
  return L.divIcon({
    className: "tb-pin",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div class="tb-circle" style="width:${size}px;height:${size}px;border-radius:9999px;display:grid;place-items:center;box-sizing:border-box;
      background:${on ? GREEN : "#fff"};border:2px solid ${on ? "#fff" : GREY};box-shadow:0 1px 3px rgba(0,0,0,.35);
      color:#fff;font:600 11px/1 Inter,sans-serif">${p.n ?? ""}</div>`,
  });
}

function pinIcon(p: MapPoint) {
  const color = p.highlighted ? GREEN : p.scheduled === true ? GREEN : p.scheduled === false ? GREY : KIND_COLOR[p.kind];
  const size = p.highlighted ? 34 : 28;
  const inner = p.n != null ? `<span style="position:absolute;top:5px;left:0;right:0;text-align:center;color:#fff;font:600 11px/1 Inter,sans-serif">${p.n}</span>` : "";
  return L.divIcon({
    className: "tb-pin",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    html: `<div class="${p.kind === "guide" ? "" : "tb-pinbody"}" style="position:relative;width:${size}px;height:${size}px">
      <svg viewBox="0 0 24 24" width="${size}" height="${size}" ${p.kind === "guide" ? 'class="tb-gpin"' : ""} style="filter:drop-shadow(0 1px 2px rgba(0,0,0,.35))">
        <path fill="${color}" d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Z"/>
        ${p.n == null ? '<circle cx="12" cy="9" r="2.6" fill="#fff"/>' : ""}
      </svg>${inner}</div>`,
  });
}

/**
 * Map tiles. With NEXT_PUBLIC_MAPBOX_TOKEN set, uses Mapbox (any Mapbox Studio style via
 * NEXT_PUBLIC_MAPBOX_STYLE, e.g. "your-username/your-style-id"); otherwise CARTO's free
 * Voyager tiles, which are fine for development.
 */
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const MAPBOX_STYLE = process.env.NEXT_PUBLIC_MAPBOX_STYLE || "mapbox/light-v11";

const FALLBACK_TILES = {
  url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
};

const TILES = MAPBOX_TOKEN
  ? {
      url: `https://api.mapbox.com/styles/v1/${MAPBOX_STYLE}/tiles/512/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`,
      tileSize: 512,
      zoomOffset: -1,
      maxZoom: 20,
      attribution:
        '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> <a href="https://www.mapbox.com/map-feedback/" target="_blank"><strong>Improve this map</strong></a>',
    }
  : {
      url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    };

function FitBounds({ points }: { points: MapPoint[] }) {
  const map = useMap();
  const key = points.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join("|");
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) map.setView([points[0].lat, points[0].lng], 13);
    else map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [48, 48], maxZoom: 14 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

/** Clears hover when the pointer leaves the map (covers fast exits that skip a marker's mouseout). */
function HoverReset({ onLeave }: { onLeave?: () => void }) {
  const map = useMap();
  useEffect(() => {
    if (!onLeave) return;
    const el = map.getContainer();
    el.addEventListener("mouseleave", onLeave);
    return () => el.removeEventListener("mouseleave", onLeave);
  }, [map, onLeave]);
  return null;
}

export default function MapView({
  points,
  route,
  onPointHover,
  onPointClick,
  highlightedId,
  legend,
  greyscale,
}: {
  points: MapPoint[];
  /** Draw a dashed line through the points in order. */
  route?: boolean;
  onPointHover?: (id: string | null) => void;
  onPointClick?: (id: string) => void;
  /** Highlights this point without rebuilding its marker (rebuilding under the cursor left hovers stuck). */
  highlightedId?: string | null;
  /** Show a key explaining pins/circles and green/grey. */
  legend?: boolean;
  /** Greyscale tiles (City Guides). */
  greyscale?: boolean;
}) {
  // Icons are only rebuilt when what they show changes, never on hover.
  const iconKey = points.map((p) => `${p.id}|${p.badge ?? ""}|${p.n ?? ""}|${p.kind}|${p.shape ?? ""}|${p.scheduled ?? ""}|${p.highlighted ? 1 : 0}`).join(",");
  const icons = useMemo(
    () => new Map(points.map((p) => [p.id, p.badge ? badgeIcon(p) : p.shape === "circle" ? circleIcon(p) : pinIcon(p)])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [iconKey],
  );
  const markers = useRef(new Map<string, L.Marker>());
  const [tiles, setTiles] = useState<typeof TILES | typeof FALLBACK_TILES>(TILES);
  const tileErrors = useRef(0);
  // Route through the itinerary in visit order (points with `order`), or through all points if none have one.
  const ordered = points.filter((p) => p.order != null).sort((a, b) => a.order! - b.order!);
  const routeLine = (ordered.length ? ordered : points).map((p) => [p.lat, p.lng] as [number, number]);

  useEffect(() => {
    markers.current.forEach((m, id) => {
      const on = id === highlightedId;
      m.getElement()?.classList.toggle("is-active", on);
      m.setZIndexOffset(on ? 1000 : 0);
    });
  }, [highlightedId, icons]);

  return (
    <div className={`relative h-full w-full${greyscale ? " tb-grey" : ""}`}>
    {legend && (
      <div className="absolute left-2 bottom-6 z-[500] rounded-lg bg-white/95 shadow px-2.5 py-2 text-[11px] leading-tight space-y-1 pointer-events-none">
        <div className="flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" width="12" height="12"><path fill={GREEN} d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Z" /></svg>
          Stay
          <span className="ml-2 inline-block size-2.5 rounded-full" style={{ background: GREEN }} />
          Event
        </div>
        <div className="flex items-center gap-1.5 text-ink-muted">
          <span className="inline-block size-2.5 rounded-full" style={{ background: GREEN }} /> On itinerary
          <span className="ml-2 inline-block size-2.5 rounded-full border-2" style={{ borderColor: GREY }} /> Saved only
        </div>
      </div>
    )}
    <MapContainer center={[40.73, -73.98]} zoom={12} scrollWheelZoom className="h-full w-full" zoomControl>
      <TileLayer
        key={tiles.url}
        {...tiles}
        eventHandlers={{
          // If Mapbox refuses the tiles (token missing on this deploy, or restricted to other URLs), fall back to free tiles
          tileerror: () => {
            if (tiles !== FALLBACK_TILES && ++tileErrors.current >= 4) {
              console.warn("[map] Mapbox tiles failed — using CARTO tiles instead. Check NEXT_PUBLIC_MAPBOX_TOKEN and its URL restrictions.");
              setTiles(FALLBACK_TILES);
            }
          },
        }}
      />
      <FitBounds points={points} />
      <HoverReset onLeave={onPointHover ? () => onPointHover(null) : undefined} />
      {route && routeLine.length > 1 && <Polyline positions={routeLine} pathOptions={{ color: GREEN, weight: 2, dashArray: "4 6" }} />}
      {points.map((p) => (
        <Marker
          key={p.id}
          position={[p.lat, p.lng]}
          icon={icons.get(p.id)!}
          zIndexOffset={p.highlighted ? 1000 : 0}
          ref={(m) => {
            if (m) markers.current.set(p.id, m);
            else markers.current.delete(p.id);
          }}
          eventHandlers={{
            mouseover: () => onPointHover?.(p.id),
            mouseout: () => onPointHover?.(null),
            click: () => onPointClick?.(p.id),
          }}
        >
          <Tooltip direction="top" offset={p.badge ? [0, -30] : [0, -28]}>
            {p.label}
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
    </div>
  );
}
