"use client";

import { money } from "@/lib/format";
import { RangeSlider } from "./RangeSlider";

export function PriceRange({
  bounds,
  value,
  onChange,
  currency = "USD",
}: {
  currency?: string;
  bounds: [number, number];
  value: [number, number];
  onChange: (v: [number, number]) => void;
}) {
  return (
    <div className="w-64">
      <RangeSlider min={bounds[0]} max={bounds[1]} value={value} onChange={onChange} format={(n) => money(n, currency)} label="Price" />
    </div>
  );
}
