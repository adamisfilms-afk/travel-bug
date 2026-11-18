"use client";

import { ArrowRight, X } from "@phosphor-icons/react";
import clsx from "clsx";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { money, priceTooltip, priceTrend } from "@/lib/format";

export function PageTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
      <h1 className="text-4xl md:text-[56px] leading-[1.1] font-extrabold tracking-tight">{children}</h1>
      {aside && <span className="text-xl md:text-[28px] text-ink-muted">{aside}</span>}
    </div>
  );
}

export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={clsx("text-2xl md:text-[34px] leading-tight font-normal", className)}>{children}</h2>;
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
    "inline-flex items-center h-[58px] px-5 rounded-lg bg-surface text-[18px] transition-colors border",
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
}: {
  label: string;
  active?: boolean;
  children?: ReactNode;
  onClear?: () => void;
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
          "h-10 px-4 rounded-full text-[16px] transition-colors inline-flex items-center gap-2",
          active ? "bg-accent text-white" : "bg-surface hover:bg-white",
        )}
      >
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
        <div className="absolute z-30 mt-2 min-w-64 rounded-xl bg-surface-strong shadow-lg border border-line p-4">{children}</div>
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
      className="grid place-items-center size-10 shrink-0 rounded-full bg-accent text-white hover:bg-accent-hover transition-colors"
    >
      <ArrowRight weight="bold" className="size-4" />
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
  return (
    <span className={clsx("relative group inline-block font-semibold text-[18px] tabular-nums", className)}>
      <span
        tabIndex={0}
        className={clsx("cursor-help outline-none", t === "up" && "text-price-up", t === "down" && "text-price-down")}
      >
        {money(current, currency)}
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute right-0 bottom-full mb-2 w-64 rounded-lg bg-ink text-white text-[13px] font-normal leading-snug px-3 py-2 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 transition z-30"
      >
        {priceTooltip(kind, saved, current, currency)}
      </span>
    </span>
  );
}

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-surface border border-line/60 text-[13px] text-ink/70 tabular-nums",
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
        className="w-full max-w-lg rounded-2xl bg-canvas shadow-2xl p-6 md:p-8"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-6">
          <h2 className="text-2xl font-bold">{title}</h2>
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
  "h-12 w-full rounded-lg bg-surface px-4 text-[16px] text-ink placeholder:text-ink-muted outline-none border border-transparent focus:border-accent-soft";

export function PrimaryButton({ children, className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={clsx(
        "h-[58px] px-10 rounded-[10px] bg-accent text-white text-[22px] hover:bg-accent-hover transition-colors disabled:opacity-60 border border-accent-soft",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function UnderConstruction({ title, blurb }: { title: string; blurb: string }) {
  return (
    <div className="space-y-10">
      <PageTitle>{title}</PageTitle>
      <div className="rounded-2xl dashed-accent bg-surface p-10 md:p-16 max-w-3xl">
        <p className="text-sm uppercase tracking-widest text-accent-ink font-semibold">Under construction</p>
        <p className="mt-3 text-xl">{blurb}</p>
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
