"use client";

import { ArrowSquareOut, CaretDown } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { money } from "@/lib/format";
import type { BookingOption } from "@/lib/types";
import { useClickOutside } from "./ui";

const btn = "h-8 px-4 rounded-full bg-accent text-white text-[14px] hover:bg-accent-hover inline-flex items-center gap-1 whitespace-nowrap";

/**
 * Green "Book" button. With several sellers it opens a menu of them (cheapest first), each
 * linking straight to that seller's booking page; otherwise it links directly.
 */
export function BookButton({ href, options, currency }: { href: string; options?: BookingOption[]; currency: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));
  const stop = (e: React.PointerEvent) => e.stopPropagation(); // don't start a drag in the planner

  if (!options || options.length <= 1) {
    return (
      <a href={options?.[0]?.url ?? href} target="_blank" rel="noopener noreferrer" onPointerDown={stop} title={options?.[0] ? `Book with ${options[0].name}` : "Book"} className={btn}>
        Book
      </a>
    );
  }

  return (
    <div ref={ref} className="relative" onPointerDown={stop}>
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={btn}>
        Book
        <CaretDown weight="bold" className="size-3" />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-72 rounded-xl bg-surface-strong shadow-lg border border-line py-2 text-[14px]">
          <p className="px-4 py-1 text-xs uppercase tracking-wider text-ink-muted">Book with</p>
          {options.map((o, i) => (
            <a
              key={i}
              href={o.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2 hover:bg-surface"
            >
              <span className="flex-1 truncate">{o.name}</span>
              {o.price != null && <span className="font-semibold tabular-nums">{money(o.price, currency)}</span>}
              <ArrowSquareOut className="size-3.5 text-ink-muted shrink-0" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
