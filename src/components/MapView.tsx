"use client";

import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  label: string;
  kind: "flight" | "stay" | "activity" | "hotel";
  highlighted?: boolean;
  /** Optional sequence number shown inside the pin. */
  n?: number;
}

const KIND_COLOR: Record<MapPoint["kind"], string> = {
  flight: "#3c6fb0",
  stay: "#111111",
  hotel: "#111111",
  activity: "#5e9a50",
};

function pinIcon(p: MapPoint) {
  const color = p.highlighted ? "#7ab06b" : KIND_COLOR[p.kind];
  const size = p.highlighted ? 34 : 28;
  const inner = p.n != null ? `<span style="position:absolute;top:5px;left:0;right:0;text-align:center;color:#fff;font:600 11px/1 Inter,sans-serif">${p.n}</span>` : "";
  return L.divIcon({
    className: "tb-pin",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    html: `<div style="position:relative;width:${size}px;height:${size}px">
      <svg viewBox="0 0 24 24" width="${size}" height="${size}" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,.35))">
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

export default function MapView({
  points,
  route,
  onPointHover,
}: {
  points: MapPoint[];
  /** Draw a dashed line through the points in order. */
  route?: boolean;
  onPointHover?: (id: string | null) => void;
}) {
  return (
    <MapContainer center={[40.73, -73.98]} zoom={12} scrollWheelZoom className="h-full w-full" zoomControl>
      <TileLayer key={TILES.url} {...TILES} />
      <FitBounds points={points} />
      {route && points.length > 1 && (
        <Polyline positions={points.map((p) => [p.lat, p.lng] as [number, number])} pathOptions={{ color: "#5e9a50", weight: 2, dashArray: "4 6" }} />
      )}
      {points.map((p) => (
        <Marker
          key={p.id}
          position={[p.lat, p.lng]}
          icon={pinIcon(p)}
          zIndexOffset={p.highlighted ? 1000 : 0}
          eventHandlers={{ mouseover: () => onPointHover?.(p.id), mouseout: () => onPointHover?.(null) }}
        >
          <Tooltip direction="top" offset={[0, -28]}>
            {p.label}
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
