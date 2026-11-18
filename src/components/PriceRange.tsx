"use client";

import { money } from "@/lib/format";

export function PriceRange({
  bounds,
  value,
  onChange,
}: {
  bounds: [number, number];
  value: [number, number];
  onChange: (v: [number, number]) => void;
}) {
  const [lo, hi] = value;
  return (
    <div className="space-y-3 w-64">
      <p className="text-sm text-ink-muted">
        {money(lo)} – {money(hi)}
      </p>
      <label className="block text-xs text-ink-muted">
        Min
        <input type="range" className="w-full accent-accent" min={bounds[0]} max={bounds[1]} value={lo} onChange={(e) => onChange([Math.min(Number(e.target.value), hi), hi])} />
      </label>
      <label className="block text-xs text-ink-muted">
        Max
        <input type="range" className="w-full accent-accent" min={bounds[0]} max={bounds[1]} value={hi} onChange={(e) => onChange([lo, Math.max(Number(e.target.value), lo)])} />
      </label>
    </div>
  );
}
