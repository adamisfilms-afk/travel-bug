"use client";

import { Check, Plus } from "@phosphor-icons/react";
import clsx from "clsx";
import { useRef, useState } from "react";
import { addDays, toDay } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Trip } from "@/lib/types";
import { Field, inputCls, Modal, PrimaryButton, TabChip, useClickOutside } from "./ui";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (t: Trip) => void;
  defaults?: Partial<Trip>;
}

export function NewTripDialog(props: DialogProps) {
  // Mount the form only while open so it picks up fresh defaults each time.
  return (
    <Modal open={props.open} onClose={props.onClose} title="Add new trip">
      {props.open && <NewTripForm {...props} />}
    </Modal>
  );
}

function NewTripForm({ onClose, onCreated, defaults }: DialogProps) {
  const createTrip = useStore((s) => s.createTrip);
  const today = toDay(new Date());
  const [form, setForm] = useState({
    name: defaults?.name ?? "",
    destination: defaults?.destination ?? "",
    startDate: defaults?.startDate ?? addDays(today, 30),
    endDate: defaults?.endDate ?? addDays(today, 35),
    travellers: defaults?.travellers ?? 1,
  });
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.destination.trim()) return setError("Where are you going?");
    if (form.endDate < form.startDate) return setError("The trip must end after it starts.");
    const trip = createTrip({
      name: form.name.trim() || form.destination.trim(),
      destination: form.destination.trim(),
      startDate: form.startDate,
      endDate: form.endDate,
      travellers: Math.max(1, form.travellers),
    });
    setError("");
    onCreated?.(trip);
    onClose();
  };

  return (
      <form onSubmit={submit} className="space-y-4">
        <Field label="Destination">
          <input
            autoFocus
            className={inputCls}
            placeholder="e.g. Lisbon"
            value={form.destination}
            onChange={(e) => setForm({ ...form, destination: e.target.value })}
          />
        </Field>
        <Field label="Trip name (optional)">
          <input
            className={inputCls}
            placeholder={form.destination || "Summer in Lisbon"}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Start">
            <input type="date" className={inputCls} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </Field>
          <Field label="End">
            <input type="date" className={inputCls} value={form.endDate} min={form.startDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </Field>
        </div>
        <Field label="Travellers">
          <input
            type="number"
            min={1}
            max={20}
            className={inputCls}
            value={form.travellers}
            onChange={(e) => setForm({ ...form, travellers: Number(e.target.value) })}
          />
        </Field>
        {error && <p className="text-price-up text-sm">{error}</p>}
        <div className="pt-2 flex justify-end">
          <PrimaryButton type="submit" className="!text-base !h-11 !px-6">
            Create trip
          </PrimaryButton>
        </div>
      </form>
  );
}

/** Row of trip chips + "Add new trip". */
export function TripChips({
  selectedId,
  onSelect,
  hrefFor,
}: {
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  hrefFor?: (id: string) => string;
}) {
  const trips = useStore((s) => s.trips);
  const ready = useStore((s) => s.ready);
  const [open, setOpen] = useState(false);
  const sorted = [...trips].sort((a, b) => a.startDate.localeCompare(b.startDate));
  return (
    <div className="flex flex-wrap gap-3 md:gap-5">
      {!ready && <div className="h-11 w-40 rounded-lg bg-surface animate-pulse" />}
      {sorted.map((t) => (
        <TabChip
          key={t.id}
          selected={t.id === selectedId}
          onClick={onSelect ? () => onSelect(t.id) : undefined}
          href={hrefFor?.(t.id)}
        >
          {t.name}
        </TabChip>
      ))}
      <TabChip onClick={() => setOpen(true)}>Add new trip</TabChip>
      <NewTripDialog open={open} onClose={() => setOpen(false)} onCreated={(t) => onSelect?.(t.id)} />
    </div>
  );
}

/** Button + menu for adding a search result to one of the user's trips. */
export function AddToTripButton({
  onAdd,
  label = "Add to trip",
  addedTo,
  defaults,
  compact,
  tone = "light",
}: {
  onAdd: (tripId: string) => void;
  label?: string;
  /** Round icon-only button. */
  compact?: boolean;
  /** Compact style: "light" (white, green outline) or "dark" (black, for use over photos). */
  /** "guide": cream with a yellow-green hover, for the dark City Guides cards. */
  tone?: "light" | "dark" | "guide";
  addedTo?: string[];
  defaults?: Partial<Trip>;
}) {
  const trips = useStore((s) => s.trips);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));
  const added = addedTo?.length ?? 0;

  return (
    <div ref={ref} className="relative">
      {compact ? (
        <button
          type="button"
          aria-label={added ? `${label} (saved to ${added} trip${added > 1 ? "s" : ""})` : label}
          title={added ? "Saved — add to another trip" : label}
          onClick={() => setOpen((o) => !o)}
          className={clsx(
            "grid place-items-center size-8 rounded-full border transition-colors cursor-pointer",
            tone === "guide"
              ? "bg-guide-ink border-guide-ink text-guide-bg hover:bg-guide-active hover:border-guide-active"
              : added
              ? "bg-accent-soft/40 border-accent-soft text-accent-ink"
              : tone === "dark"
                ? "bg-ink border-ink text-white hover:bg-accent hover:border-accent"
                : "bg-white border-accent-soft text-accent-ink hover:bg-accent hover:text-white hover:border-accent",
          )}
        >
          {added ? <Check weight="bold" className="size-3.5" /> : <Plus weight="bold" className="size-3.5" />}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="h-8 px-3.5 rounded-full bg-accent text-white text-[14px] hover:bg-accent-hover inline-flex items-center gap-1.5 whitespace-nowrap"
        >
          <Plus weight="bold" className="size-3.5" />
          {added ? "Added" : label}
        </button>
      )}
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-64 rounded-xl bg-surface-strong shadow-lg border border-line py-2">
          <p className="px-4 py-1 text-xs uppercase tracking-wider text-ink-muted">Add to…</p>
          {trips.map((t) => {
            const done = addedTo?.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                disabled={done}
                onClick={() => {
                  onAdd(t.id);
                  setOpen(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-surface disabled:text-ink-muted disabled:hover:bg-transparent flex justify-between"
              >
                <span>{t.name}</span>
                {done && <span className="text-xs text-accent-ink">Saved</span>}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              setCreating(true);
              setOpen(false);
            }}
            className="w-full text-left px-4 py-2 hover:bg-surface text-accent-ink border-t border-line mt-1"
          >
            + New trip
          </button>
        </div>
      )}
      <NewTripDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(t) => onAdd(t.id)}
        defaults={defaults}
      />
    </div>
  );
}
