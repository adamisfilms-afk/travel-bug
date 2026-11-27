"use client";

import { ArrowRight, X } from "@phosphor-icons/react";
import clsx from "clsx";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { money, priceTooltip, priceTrend } from "@/lib/format";

export function PageTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
      <h1 className="text-3xl md:text-[42px] leading-[1.1] font-extrabold tracking-tight">{children}</h1>
      {aside && <span className="text-lg md:text-[22px] text-ink-muted">{aside}</span>}
    </div>
  );
}

export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={clsx("text-xl md:text-[26px] leading-tight font-normal", className)}>{children}</h2>;
}

/** Large rectangular chip used for trip tabs ("New York City", "Add new trip"). */
export function TabChip({
  children,
  selected,
  onClick,
  href,
}: {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  href?: string;
}) {
  const cls = clsx(
    "inline-flex items-center h-11 px-4 rounded-lg bg-surface text-[15px] transition-colors border",
    selected ? "dashed-accent" : "border-transparent hover:border-line",
  );
  if (href)
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

/** Rounded pill filter chip with an optional popover. */
export function FilterChip({
  label,
  active,
  children,
  onClear,
  align = "left",
  icon,
}: {
  label: string;
  active?: boolean;
  children?: ReactNode | ((close: () => void) => ReactNode);
  onClear?: () => void;
  /** Which edge the popover lines up with (use "right" for chips at the right edge). */
  align?: "left" | "right";
  icon?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          "h-8 px-3.5 rounded-full text-[14px] transition-colors inline-flex items-center gap-2",
          active ? "bg-accent text-white" : "bg-surface hover:bg-white",
        )}
      >
        {icon}
        {label}
        {active && onClear && (
          <span
            role="button"
            aria-label={`Clear ${label}`}
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="-mr-1 rounded-full hover:bg-white/20 p-0.5"
          >
            <X className="size-3.5" weight="bold" />
          </span>
        )}
      </button>
      {open && children && (
        <div
          className={clsx(
            "absolute z-30 mt-2 min-w-64 rounded-xl bg-surface-strong shadow-lg border border-line p-4 text-[14px]",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {typeof children === "function" ? children(() => setOpen(false)) : children}
        </div>
      )}
    </div>
  );
}

export function ArrowButton({ href, label = "Book" }: { href: string; label?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="grid place-items-center size-8 shrink-0 rounded-full bg-accent text-white hover:bg-accent-hover transition-colors"
    >
      <ArrowRight weight="bold" className="size-3.5" />
    </a>
  );
}

export function PriceTag({
  kind,
  saved,
  current,
  currency,
  className,
}: {
  kind: "flight" | "stay";
  saved: number;
  current: number;
  currency: string;
  className?: string;
}) {
  const t = priceTrend(saved, current);
  const [show, setShow] = useState(false);
  // Also hide on click/drag start, window blur or scroll so it can never get stuck open.
  useEffect(() => {
    if (!show) return;
    const hide = () => setShow(false);
    window.addEventListener("pointerdown", hide);
    window.addEventListener("blur", hide);
    window.addEventListener("scroll", hide, true);
    return () => {
      window.removeEventListener("pointerdown", hide);
      window.removeEventListener("blur", hide);
      window.removeEventListener("scroll", hide, true);
    };
  }, [show]);
  return (
    <span
      className={clsx("relative inline-block font-semibold tabular-nums", className)}
      onPointerEnter={(e) => e.pointerType === "mouse" && setShow(true)}
      onPointerLeave={() => setShow(false)}
    >
      <span className={clsx("cursor-help", t === "up" && "text-price-up", t === "down" && "text-price-down")}>{money(current, currency)}</span>
      {show && (
        // Opens to the left of the price so it never covers the row's buttons.
        <span
          role="tooltip"
          className="pointer-events-none absolute right-full top-1/2 -translate-y-1/2 mr-3 w-60 rounded-lg bg-ink text-white text-[12.5px] font-normal leading-snug px-3 py-2 z-30 text-left shadow-lg"
        >
          {priceTooltip(kind, saved, current, currency)}
        </span>
      )}
    </span>
  );
}

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 h-6 px-2 rounded-full bg-surface border border-line/60 text-[12px] text-ink/70 tabular-nums",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/30 p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded-2xl bg-canvas text-ink shadow-2xl p-6"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-6">
          <h2 className="text-xl font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 rounded hover:bg-surface">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm text-ink-muted">
      {label}
      {children}
    </label>
  );
}

export const inputCls =
  "h-11 w-full rounded-lg bg-surface px-4 text-[15px] text-ink placeholder:text-ink-muted outline-none border border-transparent focus:border-accent-soft";

export function PrimaryButton({ children, className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={clsx(
        "h-12 px-8 rounded-[10px] bg-accent text-white text-[17px] hover:bg-accent-hover transition-colors disabled:opacity-60 border border-accent-soft",
        className,
      )}
    >
      {children}
    </button>
  );
}

/**
 * Thin bar along the bottom of a button while a search runs: fills with progress
 * when `progress` has a total above 1, otherwise animates continuously.
 */
export function ButtonLoadingBar({ progress }: { progress: { done: number; total: number } | boolean | null }) {
  if (!progress) return null;
  const p = typeof progress === "object" && progress.total > 1 ? progress : null;
  return (
    <span aria-hidden className="absolute inset-x-0 bottom-0 h-[3px] bg-white/25 overflow-hidden">
      {p ? (
        <span
          className="absolute inset-y-0 left-0 bg-white transition-[width] duration-300"
          style={{ width: `${Math.max(8, (p.done / p.total) * 100)}%` }}
        />
      ) : (
        <span className="tb-indeterminate bg-white" />
      )}
    </span>
  );
}

export function UnderConstruction({ title, blurb }: { title: string; blurb: string }) {
  return (
    <div className="space-y-10">
      <PageTitle>{title}</PageTitle>
      <div className="rounded-2xl dashed-accent bg-surface p-8 md:p-12 max-w-3xl">
        <p className="text-sm uppercase tracking-widest text-accent-ink font-semibold">Under construction</p>
        <p className="mt-3 text-lg">{blurb}</p>
      </div>
    </div>
  );
}

export function useClickOutside(ref: React.RefObject<HTMLElement | null>, fn: () => void) {
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) fn();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [ref, fn]);
}
