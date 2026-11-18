"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowLeft, DotsSixVertical, PencilSimple, Plus, Trash, X } from "@phosphor-icons/react";
import clsx from "clsx";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CATEGORY_ICON, ItineraryEntry, legForDay, makeLookup, type Lookup } from "@/components/itinerary";
import { ArrowButton, Field, inputCls, Modal, PageTitle, PriceTag, PrimaryButton, SectionTitle } from "@/components/ui";
import { CATEGORY_LABEL, suggestionsFor } from "@/lib/activities";
import { dayMonth, daysBetween, eachDay, hhmm, longDay, rangeLabel, shortDate } from "@/lib/format";
import { itineraryByDay, useStore } from "@/lib/store";
import type { ActivityCategory, ItemKind, ItineraryItem, SavedActivity, SavedFlight, SavedStay, Trip } from "@/lib/types";

type SourceData = { type: "source"; kind: ItemKind; refId: string };
type ItemData = { type: "item"; day: string };
type DayData = { type: "day"; day: string };

/** Prefer itinerary items under the pointer, then day containers. */
const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  const list = hits.length ? hits : rectIntersection(args);
  const items = list.filter((c) => c.data?.droppableContainer?.data?.current?.type === "item");
  return items.length ? items : list;
};

// ---------------------------------------------------------------------------
// Saved items (drag sources)
// ---------------------------------------------------------------------------

function useSource(kind: ItemKind, refId: string) {
  const data: SourceData = { type: "source", kind, refId };
  return useDraggable({ id: `src:${kind}:${refId}`, data });
}

function RowShell({
  kind,
  refId,
  children,
  onRemove,
  scheduled,
}: {
  kind: ItemKind;
  refId: string;
  children: React.ReactNode;
  onRemove: () => void;
  scheduled: boolean;
}) {
  const { setNodeRef, listeners, attributes, isDragging } = useSource(kind, refId);
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={clsx(
        "group relative rounded-[10px] bg-surface dashed-accent pl-8 pr-4 py-3.5 cursor-grab active:cursor-grabbing touch-none transition-shadow hover:shadow-sm",
        isDragging && "opacity-50",
      )}
    >
      <DotsSixVertical className="absolute left-2 top-1/2 -translate-y-1/2 size-5 text-ink/25 group-hover:text-ink/50" />
      {children}
      <div className="absolute -top-2.5 right-14 hidden group-hover:flex gap-1">
        {scheduled && <span className="rounded-full bg-accent-soft/60 text-accent-ink text-[11px] px-2 py-0.5">In itinerary</span>}
        <button
          type="button"
          aria-label="Remove from trip"
          title="Remove from trip"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onRemove}
          className="rounded-full bg-white border border-line p-1 text-ink/60 hover:text-price-up"
        >
          <Trash className="size-3.5" />
        </button>
      </div>
      {scheduled && <span className="absolute left-3 top-2 size-1.5 rounded-full bg-accent group-hover:hidden" title="In itinerary" />}
    </div>
  );
}

function FlightRowBody({ f }: { f: SavedFlight }) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex-1 min-w-0 space-y-2.5">
        {f.legs.map((leg, i) => (
          <div key={i} className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_80px_120px_110px] gap-x-6 gap-y-0.5 text-[16px] xl:text-[17px]">
            <span className="truncate">
              {leg.from.name} ({leg.from.code}) - {leg.to.name} ({leg.to.code})
            </span>
            <span className="text-ink-muted whitespace-nowrap">{leg.flightNumber}</span>
            <span className="text-ink-muted whitespace-nowrap tabular-nums">
              {hhmm(leg.depart)} - {hhmm(leg.arrive)}
            </span>
            <span className="text-ink-muted whitespace-nowrap">{shortDate(leg.depart)}</span>
          </div>
        ))}
      </div>
      <div className="w-20 text-right self-start pt-0.5">
        <PriceTag kind="flight" saved={f.priceSaved} current={f.priceCurrent} currency={f.currency} />
      </div>
      <div onPointerDown={(e) => e.stopPropagation()} className="self-start">
        <ArrowButton href={f.bookingUrl} label="Book this flight" />
      </div>
    </div>
  );
}

function StayRowBody({ s }: { s: SavedStay }) {
  const nights = daysBetween(s.checkIn, s.checkOut);
  return (
    <div className="flex items-center gap-4">
      <div className="flex-1 min-w-0 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_80px_230px] gap-x-6 text-[16px] xl:text-[17px]">
        <span className="truncate">{s.name}</span>
        <span className="text-ink-muted whitespace-nowrap">
          {nights} night{nights === 1 ? "" : "s"}
        </span>
        <span className="text-ink-muted whitespace-nowrap">
          {dayMonth(s.checkIn)} - {dayMonth(s.checkOut)}
        </span>
      </div>
      <div className="w-20 text-right">
        <PriceTag kind="stay" saved={s.priceSaved} current={s.priceCurrent} currency={s.currency} />
      </div>
      <div onPointerDown={(e) => e.stopPropagation()}>
        <ArrowButton href={s.bookingUrl} label="Book this stay" />
      </div>
    </div>
  );
}

function ActivityRowBody({ a }: { a: SavedActivity }) {
  const Icon = CATEGORY_ICON[a.category];
  return (
    <div className="flex items-center gap-3 text-[16px] xl:text-[17px]">
      <Icon className="size-5 text-ink/50" />
      <span className="flex-1 truncate">{a.name}</span>
      <span className="text-ink-muted text-sm">{CATEGORY_LABEL[a.category]}</span>
    </div>
  );
}

function AddActivity({ trip }: { trip: Trip }) {
  const { activities, addActivity } = useStore();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ActivityCategory>("sight");
  const saved = new Set(activities.filter((a) => a.tripId === trip.id).map((a) => a.name.toLowerCase()));
  const suggestions = suggestionsFor(trip.destination).filter((s) => !saved.has(s.name.toLowerCase()));

  return (
    <div className="space-y-3">
      <form
        className="flex flex-wrap gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          addActivity(trip.id, { name: name.trim(), category });
          setName("");
        }}
      >
        <input className={clsx(inputCls, "!w-auto flex-1 min-w-48")} placeholder="Add something to do…" value={name} onChange={(e) => setName(e.target.value)} />
        <select className="h-12 rounded-lg bg-surface px-4 text-[16px] outline-none border border-transparent focus:border-accent-soft" value={category} onChange={(e) => setCategory(e.target.value as ActivityCategory)}>
          {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button type="submit" className="h-12 px-5 rounded-lg bg-accent text-white hover:bg-accent-hover">
          Add
        </button>
      </form>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-ink-muted mr-1">Suggestions:</span>
          {suggestions.slice(0, 6).map((s) => (
            <button
              key={s.name}
              type="button"
              onClick={() => addActivity(trip.id, s)}
              className="h-8 px-3 rounded-full bg-surface hover:bg-white text-sm inline-flex items-center gap-1"
            >
              <Plus className="size-3" weight="bold" /> {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Itinerary (drop targets)
// ---------------------------------------------------------------------------

function SortableEntry({ item, lookup }: { item: ItineraryItem; lookup: Lookup }) {
  const { setItemTime, removeItineraryItem } = useStore();
  const data: ItemData = { type: "item", day: item.day };
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id: item.id, data });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={clsx(
        "group relative rounded-lg -mx-2 px-2 py-1.5 cursor-grab active:cursor-grabbing touch-none hover:bg-surface/70",
        isDragging && "opacity-40",
      )}
    >
      <ItineraryEntry item={item} lookup={lookup} editable onTime={(t) => setItemTime(item.id, t)} />
      <button
        type="button"
        aria-label="Remove from itinerary"
        title="Remove from itinerary"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => removeItineraryItem(item.id)}
        className="absolute right-1 top-1.5 hidden group-hover:block rounded-full p-1 text-ink/40 hover:text-price-up hover:bg-white"
      >
        <X className="size-3.5" weight="bold" />
      </button>
    </div>
  );
}

function DaySection({ day, items, lookup }: { day: string; items: ItineraryItem[]; lookup: Lookup }) {
  const data: DayData = { type: "day", day };
  const { setNodeRef, isOver } = useDroppable({ id: `day:${day}`, data });
  return (
    <div className="py-5 first:pt-0">
      <h4 className="text-[20px] font-semibold mb-4">{longDay(day)}</h4>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={clsx(
            "min-h-14 rounded-lg space-y-3 transition-colors",
            isOver && "outline-2 outline-dashed outline-accent-soft outline-offset-4 bg-accent-soft/10",
          )}
        >
          {items.map((i) => (
            <SortableEntry key={i.id} item={i} lookup={lookup} />
          ))}
          {items.length === 0 && (
            <div className="h-14 rounded-lg border border-dashed border-line grid place-items-center text-sm text-ink-muted">
              Drag items here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit trip
// ---------------------------------------------------------------------------

function EditTripDialog({ trip, open, onClose }: { trip: Trip; open: boolean; onClose: () => void }) {
  const { updateTrip, deleteTrip } = useStore();
  const router = useRouter();
  const [form, setForm] = useState(trip);
  useEffect(() => setForm(trip), [trip, open]);
  return (
    <Modal open={open} onClose={onClose} title="Edit trip">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (form.endDate < form.startDate) return;
          updateTrip(trip.id, {
            name: form.name.trim() || trip.name,
            destination: form.destination.trim() || trip.destination,
            startDate: form.startDate,
            endDate: form.endDate,
            travellers: Math.max(1, form.travellers),
          });
          onClose();
        }}
      >
        <Field label="Trip name">
          <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Destination">
          <input className={inputCls} value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Start">
            <input type="date" className={inputCls} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </Field>
          <Field label="End">
            <input type="date" className={inputCls} min={form.startDate} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </Field>
        </div>
        <Field label="Travellers">
          <input type="number" min={1} className={inputCls} value={form.travellers} onChange={(e) => setForm({ ...form, travellers: Number(e.target.value) })} />
        </Field>
        <div className="pt-2 flex justify-between items-center">
          <button
            type="button"
            className="text-price-up hover:underline"
            onClick={() => {
              if (confirm(`Delete "${trip.name}" and everything saved in it?`)) {
                deleteTrip(trip.id);
                router.push("/trips");
              }
            }}
          >
            Delete trip
          </button>
          <PrimaryButton type="submit" className="!text-lg !h-12 !px-8">
            Save
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function usePriceRefresh(tripId: string | undefined) {
  const [status, setStatus] = useState<"idle" | "checking" | "done" | "error">("idle");
  const ready = useStore((s) => s.ready);
  const done = useRef<string | null>(null);
  useEffect(() => {
    if (!ready || !tripId || done.current === tripId) return;
    done.current = tripId;
    const { flights, stays, applyPrices } = useStore.getState();
    const f = flights.filter((x) => x.tripId === tripId);
    const s = stays.filter((x) => x.tripId === tripId);
    if (!f.length && !s.length) return;
    setStatus("checking");
    fetch("/api/prices/refresh", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ flights: f, stays: s }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => {
        applyPrices(d.flights, d.stays, d.checkedAt);
        setStatus("done");
      })
      .catch(() => setStatus("error"));
  }, [ready, tripId]);
  return status;
}

export default function PlannerPage() {
  const { id } = useParams<{ id: string }>();
  const store = useStore();
  const { ready, trips, flights, stays, activities, itinerary, addToItinerary, moveItineraryItem } = store;
  const trip = trips.find((t) => t.id === id);
  const [editing, setEditing] = useState(false);
  const [active, setActive] = useState<{ kind: ItemKind; refId: string; day?: string } | null>(null);
  const priceStatus = usePriceRefresh(trip?.id);

  const tripFlights = flights.filter((f) => f.tripId === id);
  const tripStays = stays.filter((s) => s.tripId === id);
  const tripActivities = activities.filter((a) => a.tripId === id);
  const lookup = useMemo(() => makeLookup(flights, stays, activities), [flights, stays, activities]);
  const byDay = useMemo(() => itineraryByDay(itinerary, id), [itinerary, id]);
  const scheduled = useMemo(() => new Set(itinerary.filter((i) => i.tripId === id).map((i) => `${i.kind}:${i.refId}`)), [itinerary, id]);

  const days = useMemo(() => {
    if (!trip) return [];
    const set = new Set(eachDay(trip.startDate, trip.endDate));
    Object.keys(byDay).forEach((d) => set.add(d)); // keep items outside the date range visible
    return [...set].sort();
  }, [trip, byDay]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (!ready) return <div className="h-14 w-80 rounded-lg bg-surface animate-pulse" />;
  if (!trip)
    return (
      <div className="space-y-4">
        <PageTitle>Trip not found</PageTitle>
        <Link href="/trips" className="text-accent-ink underline">
          Back to your trips
        </Link>
      </div>
    );

  const defaultTime = (kind: ItemKind, refId: string, day: string): string | null => {
    if (kind === "flight") {
      const f = lookup.flights.get(refId);
      const leg = f && legForDay(f, day);
      return leg && leg.depart.startsWith(day) ? hhmm(leg.depart) : null;
    }
    if (kind === "stay") {
      const s = lookup.stays.get(refId);
      if (s?.checkIn === day) return "15:00";
      if (s?.checkOut === day) return "11:00";
    }
    return null;
  };

  const onDragStart = (e: DragStartEvent) => {
    const d = e.active.data.current as SourceData | ItemData | undefined;
    if (d?.type === "source") setActive({ kind: d.kind, refId: d.refId });
    else if (d?.type === "item") {
      const it = itinerary.find((i) => i.id === e.active.id);
      if (it) setActive({ kind: it.kind, refId: it.refId, day: it.day });
    }
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActive(null);
    const { active: a, over } = e;
    if (!over) return;
    const src = a.data.current as SourceData | ItemData;
    const tgt = over.data.current as ItemData | DayData | undefined;
    if (!tgt) return;
    const day = tgt.day;
    const list = byDay[day] ?? [];
    const index = tgt.type === "item" ? list.findIndex((i) => i.id === over.id) : list.length;

    if (src.type === "source") {
      addToItinerary(trip.id, day, src.kind, src.refId, index < 0 ? undefined : index, defaultTime(src.kind, src.refId, day));
    } else if (src.type === "item") {
      if (a.id === over.id) return;
      moveItineraryItem(String(a.id), day, index < 0 ? list.length : index);
    }
  };

  const overlay = active && (
    <div className="rounded-lg bg-white shadow-xl border border-accent-soft px-4 py-3 w-[360px] cursor-grabbing">
      <ItineraryEntry
        item={{ id: "overlay", tripId: trip.id, day: active.day ?? trip.startDate, position: 0, time: null, kind: active.kind, refId: active.refId }}
        lookup={lookup}
      />
    </div>
  );

  return (
    <DndContext sensors={sensors} collisionDetection={collision} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActive(null)}>
      <div className="space-y-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Link href={`/trips?trip=${trip.id}`} aria-label="Back to your trips" className="p-2 -ml-2 rounded-full hover:bg-surface">
              <ArrowLeft className="size-6" />
            </Link>
            <PageTitle aside={rangeLabel(trip.startDate, trip.endDate)}>{trip.name}</PageTitle>
          </div>
          <div className="flex items-center gap-4 text-sm text-ink-muted">
            {priceStatus === "checking" && <span>Checking latest prices…</span>}
            {priceStatus === "done" && <span>Prices updated just now</span>}
            {priceStatus === "error" && <span className="text-price-up">Couldn&apos;t refresh prices</span>}
            <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-surface hover:bg-white text-ink">
              <PencilSimple className="size-4" /> Edit trip
            </button>
          </div>
        </div>

        <div className="grid gap-10 xl:gap-16 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-12 min-w-0">
            <section className="space-y-6">
              <div className="flex items-baseline justify-between">
                <SectionTitle>Flights</SectionTitle>
                <Link href={`/flights?trip=${trip.id}`} className="text-accent-ink underline underline-offset-4">
                  Find flights
                </Link>
              </div>
              {tripFlights.length === 0 && <Empty>No flights saved yet.</Empty>}
              <div className="space-y-5">
                {tripFlights.map((f) => (
                  <RowShell key={f.id} kind="flight" refId={f.id} onRemove={() => store.removeFlight(f.id)} scheduled={scheduled.has(`flight:${f.id}`)}>
                    <FlightRowBody f={f} />
                  </RowShell>
                ))}
              </div>
            </section>

            <section className="space-y-6">
              <div className="flex items-baseline justify-between">
                <SectionTitle>Stays</SectionTitle>
                <Link href={`/stays?trip=${trip.id}&q=${encodeURIComponent(trip.destination)}`} className="text-accent-ink underline underline-offset-4">
                  Find stays
                </Link>
              </div>
              {tripStays.length === 0 && <Empty>No stays saved yet.</Empty>}
              <div className="space-y-5">
                {tripStays.map((s) => (
                  <RowShell key={s.id} kind="stay" refId={s.id} onRemove={() => store.removeStay(s.id)} scheduled={scheduled.has(`stay:${s.id}`)}>
                    <StayRowBody s={s} />
                  </RowShell>
                ))}
              </div>
            </section>

            <section className="space-y-6">
              <SectionTitle>Things to do</SectionTitle>
              <div className="space-y-3">
                {tripActivities.map((a) => (
                  <RowShell key={a.id} kind="activity" refId={a.id} onRemove={() => store.removeActivity(a.id)} scheduled={scheduled.has(`activity:${a.id}`)}>
                    <ActivityRowBody a={a} />
                  </RowShell>
                ))}
              </div>
              <AddActivity trip={trip} />
            </section>
          </div>

          <aside className="min-w-0">
            <SectionTitle className="mb-6">Itinerary</SectionTitle>
            <div className="rounded-[10px] dashed-accent px-6 py-6 lg:sticky lg:top-6 lg:max-h-[calc(100vh-48px)] overflow-y-auto divide-y divide-line/70">
              {days.map((d) => (
                <DaySection key={d} day={d} items={byDay[d] ?? []} lookup={lookup} />
              ))}
            </div>
          </aside>
        </div>
      </div>
      <DragOverlay dropAnimation={null}>{overlay}</DragOverlay>
      <EditTripDialog trip={trip} open={editing} onClose={() => setEditing(false)} />
    </DndContext>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-ink-muted">{children}</p>;
}
