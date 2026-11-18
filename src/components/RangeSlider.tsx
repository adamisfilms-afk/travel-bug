"use client";

/** Two-thumb range slider built from two overlaid native range inputs. */
export function RangeSlider({
  min,
  max,
  step = 1,
  value,
  onChange,
  format = String,
  label,
}: {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
  format?: (n: number) => string;
  label?: string;
}) {
  const [lo, hi] = value;
  const span = max - min || 1;
  const left = ((lo - min) / span) * 100;
  const right = ((hi - min) / span) * 100;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[13px]">
        {label && <span className="text-ink-muted">{label}</span>}
        <span className="tabular-nums ml-auto">
          {format(lo)} – {format(hi)}
        </span>
      </div>
      <div className="range-dual relative h-5">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-line" />
        <div className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full bg-accent" style={{ left: `${left}%`, right: `${100 - right}%` }} />
        <input
          type="range"
          aria-label={label ? `${label} from` : "From"}
          min={min}
          max={max}
          step={step}
          value={lo}
          onChange={(e) => onChange([Math.min(Number(e.target.value), hi), hi])}
          style={{ zIndex: lo > max - span * 0.1 ? 5 : 3 }}
        />
        <input
          type="range"
          aria-label={label ? `${label} to` : "To"}
          min={min}
          max={max}
          step={step}
          value={hi}
          onChange={(e) => onChange([lo, Math.max(Number(e.target.value), lo)])}
          style={{ zIndex: 4 }}
        />
      </div>
    </div>
  );
}
