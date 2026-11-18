"use client";

import { money } from "@/lib/format";
import { RangeSlider } from "./RangeSlider";

export function PriceRange({
  bounds,
  value,
  onChange,
}: {
  bounds: [number, number];
  value: [number, number];
  onChange: (v: [number, number]) => void;
}) {
  return (
    <div className="w-64">
      <RangeSlider min={bounds[0]} max={bounds[1]} value={value} onChange={onChange} format={(n) => money(n)} label="Price" />
    </div>
  );
}
