"use client";

import { useRef, useState } from "react";
import { searchAirports } from "@/lib/airports";
import type { Place } from "@/lib/types";
import { useClickOutside } from "./ui";

export function AirportInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  value: Place | null;
  onChange: (p: Place | null) => void;
  placeholder: string;
  ariaLabel: string;
}) {
  const [text, setText] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => {
    setOpen(false);
    setText(null);
  });

  const shown = text ?? (value ? `${value.city} (${value.code})` : "");
  const results = text ? searchAirports(text) : [];

  const pick = (p: Place) => {
    onChange(p);
    setText(null);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative flex-1 min-w-0">
      <input
        aria-label={ariaLabel}
        className="w-full h-full bg-transparent outline-none text-[16px] placeholder:text-ink-muted"
        placeholder={placeholder}
        value={shown}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          setHi(0);
          if (!e.target.value) onChange(null);
        }}
        onKeyDown={(e) => {
          if (!open || !results.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHi((h) => Math.min(h + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHi((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            pick(results[hi]);
          }
        }}
      />
      {open && results.length > 0 && (
        <ul className="absolute left-0 top-full mt-3 z-40 w-80 rounded-xl bg-surface-strong shadow-lg border border-line py-2">
          {results.map((a, i) => (
            <li key={a.code}>
              <button
                type="button"
                onMouseEnter={() => setHi(i)}
                onClick={() => pick(a)}
                className={`w-full text-left px-4 py-2 flex justify-between gap-3 ${i === hi ? "bg-surface" : ""}`}
              >
                <span className="truncate">
                  <span className="font-medium">{a.city}</span>
                  <span className="text-ink-muted"> · {a.name}</span>
                </span>
                <span className="text-ink-muted font-mono text-sm">{a.code}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
