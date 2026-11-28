"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
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
import { ArrowClockwise, ArrowLeft, Check, ForkKnife, FunnelSimple, LinkSimple, MapPin as MapPinIcon, CaretDown, DotsSixVertical, PencilSimple, Plus, Trash, X } from "@phosphor-icons/react";
import clsx from "clsx";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CATEGORY_ICON, ItineraryEntry, legForDay, makeLookup, type Lookup } from "@/components/itinerary";
import { Map, type MapPoint } from "@/components/Map";
import { tripMapPoints } from "@/components/tripPoints";
import { AirlineStack, carrierLabel, carriersOf } from "@/components/AirlineLogo";
import { BookButton } from "@/components/BookButton";
import { LocationPicker } from "@/components/LocationPicker";
import { PlaceModal } from "@/components/PlaceModal";
import { FlightDetails, StayDetails } from "@/components/tripDetails";
import { ShareTripButton, useOwnsTrip } from "@/components/ShareTripDialog";
import { AiLogo } from "@/components/AiLogo";
import { prefetchChat, TripAssistant } from "@/components/TripAssistant";
import { useAccountInfo } from "@/lib/auth";
import { shareTrip } from "@/lib/share";
import { useOverrides } from "@/lib/curated/overrides";
import { LocationsInput, tripLocations } from "@/components/trips";
import { Field, FilterChip, inputCls, Modal, PriceTag, PrimaryButton } from "@/components/ui";
import { CATEGORY_LABEL, suggestionsFor } from "@/lib/activities";
import { AIRPORTS } from "@/lib/airports";
import { findCuratedPlace } from "@/lib/curated/types";
import { EXPLORE_GUIDES } from "@/lib/explore/guides";
import { FOOD_GUIDES } from "@/lib/food/guides";
import { dayMonth, daysBetween, durationLabel, eachDay, hhmm, longDay, rangeLabel, shortDate } from "@/lib/format";
import { itineraryByDay, useStore } from "@/lib/store";
import type { ActivityCategory, BookingOption, ItemKind, ItineraryItem, SavedActivity, SavedFlight, SavedStay, Trip } from "@/lib/types";

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

function RowShell({
  kind,
  refId,
  children,
  onRemove,
  scheduled,
  details,
  onHover,
}: {
  kind: ItemKind;
  refId: string;
  /** Pointer entered (key) / left (null): highlights the item on the map. */
  onHover?: (key: string | null) => void;
  children: React.ReactNode;
  onRemove: () => void;
  scheduled: boolean;
  /** Extra content revealed when the row is clicked (drag still works: it needs a 6px move). */
  details?: React.ReactNode;
}) {
  const data: SourceData = { type: "source", kind, refId };
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: `src:${kind}:${refId}`, data });
  const [open, setOpen] = useState(false);
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      aria-expanded={details ? open : undefined}
      onMouseEnter={() => onHover?.(`${kind}:${refId}`)}
      onMouseLeave={() => onHover?.(null)}
      title={details ? "Click for details · drag onto a day" : undefined}
      onClick={(e) => {
        if (!details) return;
        // Clicks on the row's own controls (Book, location, time…) don't toggle it
        if ((e.target as HTMLElement).closest("button, a, input, select, label, [role=dialog]")) return;
        setOpen((o) => !o);
      }}
      className={clsx(
        "group relative rounded-[10px] bg-surface dashed-accent pl-7 pr-3 py-2.5 cursor-grab active:cursor-grabbing touch-manipulation select-none transition-shadow hover:shadow-sm",
        isDragging && "opacity-50",
      )}
    >
      {scheduled && <span className="absolute left-2 top-2 size-1.5 rounded-full bg-accent" title="In itinerary" />}
      <DotsSixVertical className="absolute left-1.5 top-3 size-4 text-ink/25 group-hover:text-ink/50" />
      {children}
      {details && open && <div className="mt-3 pt-3 border-t border-line/70 cursor-auto">{details}</div>}
      <button
        type="button"
        aria-label="Remove from trip"
        title="Remove from trip"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onRemove}
        className="absolute -top-2 -right-2 z-10 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity rounded-full bg-white border border-line p-1 text-ink/60 hover:text-price-up shadow-sm"
      >
        <Trash className="size-3" />
      </button>
    </div>
  );
}

/** Price + Book button, both centred on the first 24px text line. */
function PriceAndBook({
  kind,
  saved,
  current,
  currency,
  href,
  options,
}: {
  kind: "flight" | "stay";
  saved: number;
  current: number;
  currency: string;
  href: string;
  options?: BookingOption[];
}) {
  return (
    <>
      <div className="w-[72px] text-right self-start leading-6 text-[15px]">
        <PriceTag kind={kind} saved={saved} current={current} currency={currency} />
      </div>
      <div className="self-start h-6 flex items-center justify-end w-[86px]">
        <BookButton href={href} options={options} currency={currency} />
      </div>
    </>
  );
}

const ROW_TEXT = "text-[14px] leading-6";

function FlightRowBody({ f }: { f: SavedFlight }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0 space-y-1.5 md:space-y-1">
        {f.legs.map((leg, i) => (
          <div key={`m${i}`} className="md:hidden min-w-0">
            <p className="flex items-center gap-2 text-[14px] font-medium leading-6">
              {leg.from.code} - {leg.to.code}
              <span className="font-normal text-ink-muted">{leg.flightNumber}</span>
            </p>
            <p className="text-[12px] text-ink-muted leading-snug">
              {hhmm(leg.depart)} - {hhmm(leg.arrive)} · {shortDate(leg.depart)} · {leg.stops ? `${leg.stops} stop${leg.stops > 1 ? "s" : ""}` : "Direct"}
            </p>
          </div>
        ))}
        {f.legs.map((leg, i) => (
          <div
            key={i}
            className={clsx(
              ROW_TEXT,
              "hidden md:grid md:items-center md:grid-cols-[76px_36px_52px_100px_84px_minmax(0,1fr)] md:gap-x-3",
            )}
          >
            <span className="font-medium whitespace-nowrap">
              {leg.from.code} - {leg.to.code}
            </span>
            <span title={carrierLabel(leg)} aria-label={carriersOf(leg).map((c) => c.carrier).join(", ")} className="flex items-center">
              <AirlineStack leg={leg} />
            </span>
            <span className="text-ink-muted whitespace-nowrap">{leg.flightNumber}</span>
            <span className="text-ink-muted whitespace-nowrap tabular-nums">
              {hhmm(leg.depart)} - {hhmm(leg.arrive)}
            </span>
            <span className="text-ink-muted whitespace-nowrap">{shortDate(leg.depart)}</span>
            <span className="text-ink-muted whitespace-nowrap text-[13px] truncate">
              {leg.stops ? `${leg.stops} stop${leg.stops > 1 ? "s" : ""}` : "Direct"} · {durationLabel(leg.durationMins)}
            </span>
          </div>
        ))}
      </div>
      <div className="self-start flex flex-col items-end gap-1 md:flex-row md:items-start md:gap-3">
      <PriceAndBook
        kind="flight"
        saved={f.priceSaved}
        current={f.priceCurrent}
        currency={f.currency}
        href={f.bookingUrl}
        options={f.bookingOptions}
      />
      </div>
    </div>
  );
}

function StayRowBody({ s }: { s: SavedStay }) {
  const nights = daysBetween(s.checkIn, s.checkOut);
  return (
    <div className="flex items-center gap-3">
      <div className={clsx(ROW_TEXT, "flex-1 min-w-0 flex flex-wrap gap-x-4 md:grid md:grid-cols-[minmax(0,1fr)_64px_120px] md:gap-x-4")}>
        <span className="truncate font-medium">{s.name}</span>
        <span className="text-ink-muted whitespace-nowrap">
          {nights} night{nights === 1 ? "" : "s"}
        </span>
        <span className="text-ink-muted whitespace-nowrap">
          {dayMonth(s.checkIn)} - {dayMonth(s.checkOut)}
        </span>
      </div>
      {!s.priceSaved && !s.priceCurrent ? (
        // Saved from a City Guide or the assistant without a live price: the next price check looks it up
        <>
          <div className="w-[72px] text-right self-start leading-6 text-[15px] text-ink" aria-label="No price yet">—</div>
          <div className="self-start h-6 flex items-center justify-end w-[86px]">{s.bookingUrl && <BookButton href={s.bookingUrl} currency={s.currency} />}</div>
        </>
      ) : (
      <PriceAndBook
        kind="stay"
        saved={s.priceSaved}
        current={s.priceCurrent}
        currency={s.currency}
        href={s.bookingUrl}
        // Partner prices are per night; show each partner's whole-stay price to match the row.
        options={s.bookingOptions?.map((o) => ({ ...o, price: o.total ?? (o.price != null ? Math.round(o.price * Math.max(1, nights)) : null) }))}
      />
      )}
    </div>
  );
}

function ActivityRowBody({
  a,
  near,
  onOpen,
  tagline,
}: {
  a: SavedActivity;
  near: { lat: number; lng: number } | null;
  onOpen?: () => void;
  /** The curated place's tagline (e.g. "Grand café"), shown instead of the generic category. */
  tagline?: string;
}) {
  const Icon = CATEGORY_ICON[a.category] ?? CATEGORY_ICON.other;
  const setActivityLocation = useStore((s) => s.setActivityLocation);
  return (
    <div className={clsx(ROW_TEXT, "flex items-center gap-2.5")}>
      <Icon className="size-4 text-ink/50" />
      <span className="flex-1 min-w-0 truncate">
        {onOpen ? (
          // Only places with a curated guide entry open the place view
          <button type="button" onClick={onOpen} className="font-medium hover:underline underline-offset-2 cursor-pointer">
            {a.name}
          </button>
        ) : (
          <span className="font-medium">{a.name}</span>
        )}
        {a.place && a.place !== a.name && <span className="text-ink-muted text-[13px]"> · {a.place}</span>}
      </span>
      <span className="text-ink-muted text-[13px] whitespace-nowrap">{tagline || (CATEGORY_LABEL[a.category] ?? "Other")}</span>
      <LocationPicker activity={a} near={near} onPick={(loc) => setActivityLocation(a.id, loc)} />
    </div>
  );
}

/** Add box for the Food tab (always "Food & drink") or the Explore tab (any other category). */
function AddActivity({ trip, mode }: { trip: Trip; mode: "food" | "explore" }) {
  const activities = useStore((s) => s.activities);
  const addActivity = useStore((s) => s.addActivity);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ActivityCategory>(mode === "food" ? "food" : "sight");
  const saved = new Set(activities.filter((a) => a.tripId === trip.id).map((a) => a.name.toLowerCase()));
  const suggestions = suggestionsFor(trip.destination).filter(
    (s) => !saved.has(s.name.toLowerCase()) && (mode === "food" ? s.category === "food" : s.category !== "food"),
  );

  return (
    <div className="space-y-3">
      <form
        className="flex flex-wrap gap-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          addActivity(trip.id, { name: name.trim(), category });
          setName("");
        }}
      >
        <input
          className={clsx(inputCls, "!w-auto !h-10 flex-1 min-w-48")}
          placeholder={mode === "food" ? "Add a restaurant, café or bar…" : "Add something to do…"}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className={clsx("relative", mode === "food" && "hidden")}>
          <select
            aria-label="Category"
            className="h-10 appearance-none rounded-lg bg-surface pl-3.5 pr-10 text-[14px] outline-none border border-transparent focus:border-accent-soft cursor-pointer"
            value={category}
            onChange={(e) => setCategory(e.target.value as ActivityCategory)}
          >
            {Object.entries(CATEGORY_LABEL).filter(([k]) => k !== "food").map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <CaretDown weight="bold" className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 size-3.5 text-ink/60" />
        </div>
        <button type="submit" className="h-10 px-4 rounded-lg bg-accent text-white text-[14px] hover:bg-accent-hover">
          Add
        </button>
      </form>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[13px] text-ink-muted mr-1">Suggestions:</span>
          {suggestions.slice(0, 6).map((s) => (
            <button
              key={s.name}
              type="button"
              onClick={() => addActivity(trip.id, s)}
              className="h-7 px-2.5 rounded-full bg-surface hover:bg-white text-[13px] inline-flex items-center gap-1"
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
  const setItemTime = useStore((s) => s.setItemTime);
  const removeItineraryItem = useStore((s) => s.removeItineraryItem);
  const data: ItemData = { type: "item", day: item.day };
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id: item.id, data });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={clsx(
        "group relative rounded-lg -mx-2 px-2 py-1 cursor-grab active:cursor-grabbing touch-manipulation select-none hover:bg-surface/70",
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
        className="absolute right-1 top-1 hidden group-hover:block rounded-full p-1 text-ink/40 hover:text-price-up hover:bg-white"
      >
        <X className="size-3" weight="bold" />
      </button>
    </div>
  );
}

function DaySection({ day, items, lookup }: { day: string; items: ItineraryItem[]; lookup: Lookup }) {
  const data: DayData = { type: "day", day };
  const { setNodeRef, isOver } = useDroppable({ id: `day:${day}`, data });
  return (
    <div className="py-4 first:pt-0">
      <h4 className="text-[16px] font-semibold mb-3">{longDay(day)}</h4>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={clsx(
            "min-h-10 rounded-lg space-y-2 transition-colors",
            isOver && "outline-2 outline-dashed outline-accent-soft outline-offset-4 bg-accent-soft/10",
          )}
        >
          {items.map((i) => (
            <SortableEntry key={i.id} item={i} lookup={lookup} />
          ))}
          {items.length === 0 && (
            <div className="h-10 rounded-lg border border-dashed border-line grid place-items-center text-[13px] text-ink-muted">
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
  const updateTrip = useStore((s) => s.updateTrip);
  const deleteTrip = useStore((s) => s.deleteTrip);
  const router = useRouter();
  const owns = useOwnsTrip(trip);
  const [form, setForm] = useState({ ...trip, locations: tripLocations(trip) });
  useEffect(() => setForm({ ...trip, locations: tripLocations(trip) }), [trip, open]);
  return (
    <Modal open={open} onClose={onClose} title="Edit trip">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (form.endDate < form.startDate) return;
          updateTrip(trip.id, {
            name: form.name.trim() || trip.name,
            destination: form.locations[0] ?? trip.destination,
            locations: form.locations.length ? form.locations : tripLocations(trip),
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
        <Field label="Locations">
          <LocationsInput value={form.locations} onChange={(locations) => setForm({ ...form, locations })} />
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
          {!owns ? (
            <span className="text-[13px] text-ink-muted">Shared with you — leave from Invite.</span>
          ) : (
          <button
            type="button"
            className="text-price-up hover:underline text-[14px]"
            onClick={() => {
              if (confirm(`Delete "${trip.name}" and everything saved in it?`)) {
                deleteTrip(trip.id);
                router.push("/trips");
              }
            }}
          >
            Delete trip
          </button>
          )}
          <PrimaryButton type="submit" className="!text-base !h-11 !px-6">
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

/** Checks live prices when the planner opens; `refresh()` forces a new check. */
function usePriceRefresh(tripId: string | undefined) {
  const [status, setStatus] = useState<"idle" | "checking" | "done" | "error">("idle");
  const ready = useStore((s) => s.ready);
  const done = useRef<string | null>(null);

  const run = useCallback(
    (force: boolean) => {
      if (!tripId) return;
      const { flights, stays, applyPrices } = useStore.getState();
      const f = flights.filter((x) => x.tripId === tripId);
      const s = stays.filter((x) => x.tripId === tripId);
      if (!f.length && !s.length) return;
      setStatus("checking");
      fetch("/api/prices/refresh", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ flights: f, stays: s, force }),
      })
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then((d) => {
          applyPrices(d.flights, d.stays, d.checkedAt);
          setStatus("done");
        })
        .catch(() => setStatus("error"));
    },
    [tripId],
  );

  useEffect(() => {
    if (!ready || !tripId || done.current === tripId) return;
    done.current = tripId;
    run(false);
  }, [ready, tripId, run]);

  return { status, refresh: () => run(true) };
}

type PanelTab = "itinerary" | "map";
type SavedTab = "assistant" | "flights" | "stays" | "food" | "explore";
const SAVED_TABS: { id: SavedTab; label: string }[] = [
  { id: "assistant", label: "Assistant" },
  { id: "flights", label: "Flights" },
  { id: "stays", label: "Stays" },
  { id: "food", label: "Food" },
  { id: "explore", label: "Explore" },
];

export default function PlannerPage() {
  const { id } = useParams<{ id: string }>();
  const ready = useStore((s) => s.ready);
  const trips = useStore((s) => s.trips);
  const flights = useStore((s) => s.flights);
  const stays = useStore((s) => s.stays);
  const activities = useStore((s) => s.activities);
  const itinerary = useStore((s) => s.itinerary);
  const { addToItinerary, moveItineraryItem, removeFlight, removeStay, removeActivity } = useStore.getState();
  const trip = trips.find((t) => t.id === id);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<PanelTab>("itinerary");
  const [savedTab, setSavedTabState] = useState<SavedTab>("flights");
  // Remember the chosen tab per trip for this browser session
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(`travel-bug:planner-tab:${id}`);
      const t = (raw === "activities" ? "explore" : raw) as SavedTab | null; // old "Things to do" tab
      if (t && SAVED_TABS.some((x) => x.id === t)) setSavedTabState(t);
    } catch {
      /* ignore */
    }
  }, [id]);
  // Load the assistant chat in the background as soon as the planner opens, so the tab opens instantly
  const account = useAccountInfo();
  useEffect(() => {
    if (account.enabled && account.id && id) void prefetchChat(id);
  }, [account.enabled, account.id, id]);

  // Arriving from the home page's prompt: /trips/<id>?tab=assistant&ask=<question>
  const [initialAsk, setInitialAsk] = useState<string | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("tab") === "assistant") setSavedTabState("assistant");
    if (q.get("ask")) setInitialAsk(q.get("ask"));
  }, [id]);
  const clearAsk = useCallback(() => {
    setInitialAsk(null);
    // Drop ?ask from the address so a reload doesn't ask again
    window.history.replaceState(null, "", `${window.location.pathname}?tab=assistant`);
  }, []);
  const setSavedTab = (t: SavedTab) => {
    setSavedTabState(t);
    try {
      sessionStorage.setItem(`travel-bug:planner-tab:${id}`, t);
    } catch {
      /* ignore */
    }
  };
  const [active, setActive] = useState<{ kind: ItemKind; refId: string; day?: string } | null>(null);
  const { status: priceStatus, refresh: refreshPrices } = usePriceRefresh(trip?.id);

  const tripFlights = flights.filter((f) => f.tripId === id);
  const tripStays = stays.filter((s) => s.tripId === id);
  const tripActivities = activities.filter((a) => a.tripId === id);
  const tripFood = tripActivities.filter((a) => a.category === "food");
  // Saved events that have a curated guide entry (food or explore) can open the place view
  const curatedFor = useMemo(() => {
    const m = new globalThis.Map<string, NonNullable<ReturnType<typeof findCuratedPlace>>>();
    for (const a of activities) {
      if (a.tripId !== id) continue;
      const hit = findCuratedPlace(
        [
          { kind: "food", guides: FOOD_GUIDES },
          { kind: "explore", guides: EXPLORE_GUIDES },
        ],
        a.name,
        trip?.destination,
      );
      if (hit) m.set(a.id, hit);
    }
    return m;
  }, [activities, id, trip?.destination]);
  const [openCurated, setOpenCurated] = useState<NonNullable<ReturnType<typeof findCuratedPlace>> | null>(null);
  const tripExplore = tripActivities.filter((a) => a.category !== "food");
  const lookup = useMemo(() => makeLookup(flights, stays, activities), [flights, stays, activities]);
  const byDay = useMemo(() => itineraryByDay(itinerary, id), [itinerary, id]);
  const scheduled = useMemo(() => new Set(itinerary.filter((i) => i.tripId === id).map((i) => `${i.kind}:${i.refId}`)), [itinerary, id]);

  const days = useMemo(() => {
    if (!trip) return [];
    const set = new Set(eachDay(trip.startDate, trip.endDate));
    Object.keys(byDay).forEach((d) => set.add(d)); // keep items outside the date range visible
    return [...set].sort();
  }, [trip, byDay]);

  /** Rough centre of the trip, to bias place searches: stays, then located events, then the destination airport. */
  const tripCentre = useMemo(() => {
    const pts = [
      ...stays.filter((s) => s.tripId === id && (s.lat || s.lng)),
      ...activities.filter((a) => a.tripId === id && a.lat != null && a.lng != null),
    ] as { lat: number; lng: number }[];
    if (pts.length) return { lat: pts.reduce((n, p) => n + p.lat, 0) / pts.length, lng: pts.reduce((n, p) => n + p.lng, 0) / pts.length };
    const dest = trip && AIRPORTS.find((a) => a.city.toLowerCase() === trip.destination.toLowerCase());
    return dest ? { lat: dest.lat, lng: dest.lng } : null;
  }, [stays, activities, id, trip]);

  // Admin edits to curated places (for their taglines)
  const overrides = useOverrides((s) => s.overrides);
  const loadOverrides = useOverrides((s) => s.load);
  useEffect(loadOverrides, [loadOverrides]);

  // Food/Explore "Type" filter: each saved place's City Guide section (Dinner, Coffee, Museums…);
  // places that aren't in a guide go under "Other". Only types with something saved are offered.
  const sectionOf = (a: SavedActivity) => {
    const hit = curatedFor.get(a.id);
    return hit?.guide.sections.find((sec) => sec.places.some((p) => p.id === hit.place.id))?.title ?? "Other";
  };
  const typesFor = (list: SavedActivity[]) => {
    const order = new globalThis.Map<string, [number, number]>(); // type → [position in guide, count]
    for (const a of list) {
      const hit = curatedFor.get(a.id);
      const t = sectionOf(a);
      const cur = order.get(t);
      order.set(t, [cur?.[0] ?? (t === "Other" ? 999 : (hit?.guide.sections.findIndex((sec) => sec.title === t) ?? 998)), (cur?.[1] ?? 0) + 1]);
    }
    return [...order.entries()].sort((x, y) => x[1][0] - y[1][0]).map(([t, [, n]]) => ({ type: t, count: n }));
  };
  const [typeFilter, setTypeFilter] = useState<{ food: string[]; explore: string[] }>({ food: [], explore: [] });

  // Hovering a saved item highlights its place on the map
  const [hovered, setHovered] = useState<string | null>(null);
  const [copied, setCopied] = useState<"" | "copied" | "error">("");

  const mapPoints = useMemo<MapPoint[]>(
    () => tripMapPoints(id, { itinerary, stays, activities }, lookup),
    [itinerary, id, lookup, stays, activities],
  );

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Touch: press and hold to pick an item up, so swiping still scrolls the page
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (!ready) return <div className="h-10 w-72 rounded-lg bg-surface animate-pulse" />;
  if (!trip)
    return (
      <div className="space-y-4">
        <h1 className="font-serif text-[40px] md:text-[54px] leading-[1.05]">Trip not found</h1>
        <Link href="/trips" className="text-accent-ink underline">
          Back to your trips
        </Link>
      </div>
    );

  const defaultTime = (kind: ItemKind, refId: string, day: string): string | null => {
    if (kind === "flight") {
      // The leg departing that day (the return leg on the return date), otherwise the outbound leg.
      const f = lookup.flights.get(refId);
      const leg = f && legForDay(f, day);
      return leg ? hhmm(leg.depart) : null;
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
    if (d?.type === "source") {
      setActive({ kind: d.kind, refId: d.refId });
      setTab("itinerary"); // dropping needs the itinerary visible
    } else if (d?.type === "item") {
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
    <div className="rounded-lg bg-white shadow-xl border border-accent-soft px-3 py-2 w-[320px] cursor-grabbing">
      <ItineraryEntry
        item={{ id: "overlay", tripId: trip.id, day: active.day ?? trip.startDate, position: 0, time: null, kind: active.kind, refId: active.refId }}
        lookup={lookup}
      />
    </div>
  );

  return (
    <DndContext sensors={sensors} collisionDetection={collision} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActive(null)}>
      <div className="space-y-8">
        {/* Desktop: the buttons on the right line up with the trip dates beside the title */}
        <header className="flex flex-wrap items-center md:items-end gap-x-6 gap-y-3">
          <div className="flex items-start md:items-center gap-3 min-w-0">
            <Link href="/trips" aria-label="Back to your trips" className="p-1.5 -ml-1.5 rounded-full hover:bg-surface">
              <ArrowLeft className="size-5" />
            </Link>
            {/* Title and dates share a text baseline */}
            <div className="flex flex-wrap md:flex-nowrap items-baseline gap-x-3 min-w-0">
              <h1 className="font-serif text-[34px] md:text-[54px] leading-[1.1] md:truncate break-words">{trip.name}</h1>
              <span className="text-[14px] md:text-[15px] text-ink-muted whitespace-nowrap">{rangeLabel(trip.startDate, trip.endDate)}</span>
            </div>
          </div>
          <div className="w-full md:w-auto md:ml-auto md:-mb-[3px] flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-ink-muted">
            {priceStatus === "checking" && <span>Checking latest prices…</span>}
            {priceStatus === "done" && <span>Prices up to date</span>}
            {priceStatus === "error" && <span className="text-price-up">Couldn&apos;t refresh prices</span>}
            {priceStatus !== "checking" && tripFlights.length + tripStays.length > 0 && (
              <button
                type="button"
                onClick={refreshPrices}
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-surface hover:bg-white text-ink text-[14px]"
              >
                <ArrowClockwise className="size-3.5" /> Refresh prices
              </button>
            )}
            <ShareTripButton trip={trip} />
            <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-surface hover:bg-white text-ink text-[14px]">
              <PencilSimple className="size-3.5" /> Edit trip
            </button>
          </div>
        </header>

        <div className="grid gap-8 xl:gap-12 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_minmax(400px,0.65fr)]">
          <div className="min-w-0">
            {/* Flights / Stays / Things to do as tabs, like Itinerary / Map on the right */}
            <div className="mb-5 min-h-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
              <div role="tablist" aria-label="Saved items" className="flex items-center gap-4 md:gap-5">
                {SAVED_TABS.map((t) => {
                  return (
                    <button
                      key={t.id}
                      role="tab"
                      type="button"
                      aria-selected={savedTab === t.id}
                      aria-label={t.id === "assistant" ? "Trip assistant" : undefined}
                      title={t.id === "assistant" ? "Trip assistant" : undefined}
                      onClick={() => setSavedTab(t.id)}
                      className={clsx(
                        "text-[17px] md:text-[20px] leading-tight transition-colors whitespace-nowrap",
                        savedTab === t.id ? "text-ink underline decoration-accent decoration-[1.5px] underline-offset-[6px]" : "text-ink-muted hover:text-ink",
                      )}
                    >
                      {t.id === "assistant" ? (
                        <AiLogo
                          className={clsx(
                            "block size-[22px] md:size-6 translate-y-[2px] transition-shadow",
                            savedTab === "assistant" ? "ring-[1.5px] ring-ink ring-offset-2 ring-offset-canvas" : "hover:ring-[1.5px] hover:ring-ink/30 hover:ring-offset-2 hover:ring-offset-canvas",
                          )}
                        />
                      ) : (
                        t.label
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {savedTab === "assistant" && (
              <section role="tabpanel" aria-label="Assistant">
                <TripAssistant trip={trip} initialAsk={initialAsk} onAsked={clearAsk} />
              </section>
            )}

            {savedTab === "flights" && (
              <section role="tabpanel" aria-label="Flights" className="space-y-3">
                {tripFlights.length === 0 && <Empty>No flights saved yet.</Empty>}
                {tripFlights.map((f) => (
                  <RowShell
                    onHover={setHovered}
                    key={f.id}
                    kind="flight"
                    refId={f.id}
                    onRemove={() => removeFlight(f.id)}
                    scheduled={scheduled.has(`flight:${f.id}`)}
                    details={<FlightDetails f={f} />}
                  >
                    <FlightRowBody f={f} />
                  </RowShell>
                ))}
              </section>
            )}

            {savedTab === "stays" && (
              <section role="tabpanel" aria-label="Stays" className="space-y-3">
                {tripStays.length === 0 && <Empty>No stays saved yet.</Empty>}
                {tripStays.map((s) => (
                  <RowShell
                    onHover={setHovered}
                    key={s.id}
                    kind="stay"
                    refId={s.id}
                    onRemove={() => removeStay(s.id)}
                    scheduled={scheduled.has(`stay:${s.id}`)}
                    details={<StayDetails s={s} />}
                  >
                    <StayRowBody s={s} />
                  </RowShell>
                ))}
              </section>
            )}

            {(savedTab === "food" || savedTab === "explore") && (
              <section role="tabpanel" aria-label={savedTab === "food" ? "Food" : "Explore"} className="space-y-4">
                {(() => {
                  const list = savedTab === "food" ? tripFood : tripExplore;
                  const types = typesFor(list);
                  const chosen = typeFilter[savedTab].filter((t) => types.some((x) => x.type === t));
                  if (types.length < 2) return null;
                  return (
                    <div className="flex">
                      <FilterChip
                        label={chosen.length === 1 ? chosen[0] : chosen.length ? `${chosen.length} types` : "Filter"}
                        icon={<FunnelSimple weight="bold" className="size-3.5" />}
                        active={chosen.length > 0}
                        onClear={() => setTypeFilter((f) => ({ ...f, [savedTab]: [] }))}
                      >
                        <div className="space-y-2 min-w-52">
                          {types.map(({ type, count }) => (
                            <label key={type} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                className="accent-accent"
                                checked={chosen.includes(type)}
                                onChange={(e) =>
                                  setTypeFilter((f) => ({ ...f, [savedTab]: e.target.checked ? [...chosen, type] : chosen.filter((x) => x !== type) }))
                                }
                              />
                              <span className="flex-1">{type}</span>
                              <span className="text-ink-muted text-[13px]">{count}</span>
                            </label>
                          ))}
                        </div>
                      </FilterChip>
                    </div>
                  );
                })()}
                <div className="space-y-2.5">
                  {(savedTab === "food" ? tripFood : tripExplore).length === 0 && (
                    <Empty>
                      {savedTab === "food"
                        ? "No food saved yet — add a place below or from the Food guides."
                        : "Nothing saved yet — add something below or from the Explore guides."}
                    </Empty>
                  )}
                  {(savedTab === "food" ? tripFood : tripExplore)
                    .filter((a) => {
                      const chosen = typeFilter[savedTab].filter((t) => typesFor(savedTab === "food" ? tripFood : tripExplore).some((x) => x.type === t));
                      return !chosen.length || chosen.includes(sectionOf(a));
                    })
                    .map((a) => (
                    <RowShell onHover={setHovered} key={a.id} kind="activity" refId={a.id} onRemove={() => removeActivity(a.id)} scheduled={scheduled.has(`activity:${a.id}`)}>
                      <ActivityRowBody
                        a={a}
                        near={tripCentre}
                        onOpen={curatedFor.get(a.id) ? () => setOpenCurated(curatedFor.get(a.id)!) : undefined}
                        tagline={curatedFor.get(a.id) ? (overrides[curatedFor.get(a.id)!.place.id]?.tagline ?? curatedFor.get(a.id)!.place.tagline) : undefined}
                      />
                    </RowShell>
                  ))}
                </div>
                <AddActivity key={savedTab} trip={trip} mode={savedTab} />
              </section>
            )}
          </div>

          <aside className="min-w-0 lg:sticky lg:top-6 lg:self-start">
            <div className="mb-5 min-h-8 flex items-center gap-4 md:gap-5">
              <div role="tablist" aria-label="Itinerary or map" className="flex items-center gap-4 md:gap-5">
                {(["itinerary", "map"] as const).map((t) => (
                  <button
                    key={t}
                    role="tab"
                    type="button"
                    aria-selected={tab === t}
                    onClick={() => setTab(t)}
                    className={clsx(
                      "text-[17px] md:text-[20px] leading-tight transition-colors",
                      tab === t ? "text-ink underline decoration-accent decoration-[1.5px] underline-offset-[6px]" : "text-ink-muted hover:text-ink",
                    )}
                  >
                    {t === "itinerary" ? "Itinerary" : "Map"}
                  </button>
                ))}
              </div>
              {tab === "itinerary" && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const url = await shareTrip(trip.id);
                      await navigator.clipboard.writeText(url);
                      setCopied("copied");
                    } catch (e) {
                      console.error(e);
                      setCopied("error");
                    }
                    setTimeout(() => setCopied(""), 2200);
                  }}
                  aria-label="Copy a link to share this itinerary"
                  title="Copy a link to share this itinerary"
                  className={clsx(
                    "ml-auto inline-flex items-center gap-1.5 h-8 rounded-full text-[13px] transition-colors",
                    copied ? "px-3 bg-guide-active text-ink" : "w-8 justify-center text-ink/60 hover:text-ink hover:bg-surface",
                    copied === "error" && "!bg-price-up/15 !text-price-up",
                  )}
                >
                  {copied === "copied" ? <Check weight="bold" className="size-4" /> : <LinkSimple weight="bold" className="size-4" />}
                  {copied === "copied" && "Link copied"}
                  {copied === "error" && "Couldn't share"}
                </button>
              )}
            </div>
            {tab === "itinerary" ? (
              <div className="rounded-[10px] dashed-accent px-5 py-5 lg:max-h-[calc(100vh-110px)] overflow-y-auto no-scrollbar divide-y divide-line/70">
                {days.map((d) => (
                  <DaySection key={d} day={d} items={byDay[d] ?? []} lookup={lookup} />
                ))}
              </div>
            ) : (
              <div className="rounded-[10px] overflow-hidden dashed-accent h-[460px] lg:h-[calc(100vh-110px)]">
                <Map points={mapPoints} legend storageKey={`travel-bug:map-view:${id}`} highlightedId={mapPoints.find((p) => (p.ref ?? p.id) === hovered)?.id ?? null} />
              </div>
            )}
          </aside>
        </div>
      </div>
      <DragOverlay dropAnimation={null}>{overlay}</DragOverlay>
      <EditTripDialog trip={trip} open={editing} onClose={() => setEditing(false)} />
      {openCurated && (
        <PlaceModal
          key={openCurated.place.id}
          place={openCurated.place}
          guide={openCurated.guide}
          kind={openCurated.kind}
          curate={false}
          photoPick={openCurated.place.photo}
          EmptyIcon={openCurated.kind === "food" ? ForkKnife : MapPinIcon}
          onClose={() => setOpenCurated(null)}
        />
      )}
    </DndContext>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-ink-muted text-[14px]">{children}</p>;
}
