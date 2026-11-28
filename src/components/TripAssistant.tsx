"use client";

import { ArrowUp, Check, ForkKnife, MapPin, Plus, Star, Trash } from "@phosphor-icons/react";
import clsx from "clsx";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AiLogo } from "@/components/AiLogo";
import { PlaceModal } from "@/components/PlaceModal";
import type { AssistantCard, AssistantReply, ChatMessage } from "@/lib/assistant/types";
import { useAccountInfo } from "@/lib/auth";
import { CITY_GUIDES, kindOfPlace, type CityGuide } from "@/lib/curated/city-guides";
import { useCuratedCover } from "@/lib/curated/cover";
import { useCuratedPlace } from "@/lib/curated/overrides";
import type { CuratedGuide, CuratedPlace } from "@/lib/curated/types";
import { currencySymbol } from "@/lib/currency";
import { useSettings } from "@/lib/settingsStore";
import { addPlaceToTrip, isCuratedStay, removePlaceFromTrip, useTripsWithPlace, type PlaceToAdd } from "@/lib/tripPlaces";
import type { ActivityCategory, Trip } from "@/lib/types";

interface ChatState {
  messages: ChatMessage[];
  remaining: number | null;
  limit: number;
  enabled: boolean;
}

/** Chats already loaded this session, by trip — shown instantly when the tab opens, then refreshed. */
const chats = new Map<string, ChatState>();
const inflight = new Map<string, Promise<ChatState | { error: string }>>();

/** Load a trip's chat (shared by the planner's prefetch and the tab, so it's fetched once). */
export function prefetchChat(tripId: string): Promise<ChatState | { error: string }> {
  const running = inflight.get(tripId);
  if (running) return running;
  const p = fetch(`/api/trips/${encodeURIComponent(tripId)}/assistant`)
    .then(async (res) => {
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return { error: (d.error as string) ?? "Couldn't load the chat." };
      const state: ChatState = { messages: d.messages ?? [], remaining: d.remaining ?? null, limit: d.limit ?? 10, enabled: d.enabled !== false };
      chats.set(tripId, state);
      return state;
    })
    .catch(() => ({ error: "Couldn't load the chat." }))
    .finally(() => inflight.delete(tripId));
  inflight.set(tripId, p);
  return p;
}

/** Shown in turn while a reply is on its way. */
const THINKING = [
  "Reading your question…",
  "Looking through our City Guides…",
  "Checking ratings and reviews…",
  "Comparing prices for your dates…",
  "Weighing up the options…",
  "Picking the best fits…",
  "Nearly there…",
];

function Thinking() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => Math.min(n + 1, THINKING.length - 1)), 1900);
    return () => clearInterval(t);
  }, []);
  return (
    <p className="flex items-center gap-2.5 text-[13px] text-ink-muted" role="status">
      <AiLogo thinking className="size-6" />
      <span key={i} className="animate-[fade-in_300ms_ease-out]">
        {THINKING[i]}
      </span>
    </p>
  );
}

/**
 * The planner's Assistant tab: a chat saved with the trip. It asks a short question or two,
 * then shows places as compact cards — curated City Guide picks first, general suggestions
 * (marked as such) only when the guides are thin. Cards can be added to the trip.
 */
export function TripAssistant({ trip, initialAsk, onAsked }: { trip: Trip; initialAsk?: string | null; onAsked?: () => void }) {
  const account = useAccountInfo();
  const currency = useSettings((s) => s.currency);
  const cached = chats.get(trip.id);
  const [messages, setMessages] = useState<ChatMessage[] | null>(cached?.messages ?? null);
  const [remaining, setRemaining] = useState<number | null>(cached?.remaining ?? null);
  const [limit, setLimit] = useState(cached?.limit ?? 10);
  const [enabled, setEnabled] = useState(cached?.enabled ?? true);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const asked = useRef(false);
  // The chat fills the screen below where it starts, so the input is always visible without scrolling
  const boxRef = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState<number | null>(null);
  useLayoutEffect(() => {
    const measure = () => {
      const el = boxRef.current;
      if (el) setTop(Math.round(el.getBoundingClientRect().top + window.scrollY));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  });
  // Replies that arrive while you're here type themselves out (older ones show in full)
  const [typing, setTyping] = useState<Set<string>>(() => new Set());

  const load = useCallback(async () => {
    const d = await prefetchChat(trip.id);
    if ("error" in d) {
      setMessages((m) => m ?? []);
      return setError(d.error);
    }
    setMessages(d.messages);
    setRemaining(d.remaining);
    setLimit(d.limit);
    setEnabled(d.enabled);
  }, [trip.id]);

  // Keep the session cache current, so reopening the tab is instant
  useEffect(() => {
    if (messages) chats.set(trip.id, { messages: messages.filter((m) => !String(m.id).startsWith("pending-")), remaining, limit, enabled });
  }, [trip.id, messages, remaining, limit, enabled]);

  useEffect(() => {
    if (account.enabled && account.id) void load();
  }, [load, account.enabled, account.id]);

  const send = useCallback(
    async (raw: string) => {
      const t = raw.trim();
      if (!t || busy) return;
      setBusy(true);
      setError("");
      setText("");
      const pending: ChatMessage = { id: `pending-${Date.now()}`, role: "user", content: { text: t }, created_at: new Date().toISOString() };
      setMessages((m) => [...(m ?? []), pending]);
      try {
        // A brand-new trip may still be saving: retry once if it isn't found yet
        let res: Response | null = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          res = await fetch(`/api/trips/${encodeURIComponent(trip.id)}/assistant`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: t, currency }) });
          if (res.status !== 404) break;
          await new Promise((r) => setTimeout(r, 1200));
        }
        const d = (await res!.json().catch(() => ({}))) as Partial<AssistantReply> & { error?: string };
        if (!res!.ok) throw Object.assign(new Error(d.error ?? "Something went wrong."), { remaining: d.remaining });
        const reply = d.messages?.find((x) => x.role === "assistant");
        if (reply) setTyping((s) => new Set(s).add(String(reply.id)));
        setMessages((m) => [...(m ?? []).filter((x) => x.id !== pending.id), ...(d.messages ?? [])]);
        if (d.remaining !== undefined) setRemaining(d.remaining);
      } catch (e) {
        setMessages((m) => (m ?? []).filter((x) => x.id !== pending.id));
        setText(t);
        setError(e instanceof Error ? e.message : "Something went wrong.");
        const r = (e as { remaining?: number }).remaining;
        if (typeof r === "number") setRemaining(r);
      } finally {
        setBusy(false);
      }
    },
    [busy, trip.id, currency],
  );

  // A question typed on the home page: ask it once the chat has loaded
  useEffect(() => {
    if (!initialAsk || asked.current || messages === null) return;
    asked.current = true;
    onAsked?.();
    void send(initialAsk);
  }, [initialAsk, messages, send, onAsked]);

  // Keep the latest message in view (also while a reply types out)
  const toBottom = useCallback(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);
  useEffect(toBottom, [messages, busy, toBottom]);

  const clear = async () => {
    if (!confirm("Clear this trip's chat for everyone on the trip?")) return;
    await fetch(`/api/trips/${encodeURIComponent(trip.id)}/assistant`, { method: "DELETE" });
    setMessages([]);
  };

  if (!account.enabled) return <Note>The assistant needs accounts switched on.</Note>;
  if (!account.id) return <Note>Log in to use the assistant.</Note>;

  const lastIndex = (messages?.length ?? 0) - 1;
  const outOfMessages = remaining === 0;

  return (
    <div
      ref={boxRef}
      // Below its top edge: 24px of breathing room on desktop; on phones, also the bottom tab bar
      style={top != null ? { height: `max(380px, calc(100svh - ${top}px - var(--chat-gap)))` } : undefined}
      className="flex flex-col rounded-[10px] dashed-accent h-[min(640px,calc(100svh-220px))] [--chat-gap:calc(76px+env(safe-area-inset-bottom))] md:[--chat-gap:24px]"
    >
      <div ref={listRef} className="flex-1 overflow-y-auto no-scrollbar px-4 md:px-5 py-4 space-y-4">
        {messages === null && <div className="h-10 w-2/3 rounded-xl bg-surface animate-pulse" />}
        {messages?.length === 0 && !busy && <Welcome trip={trip} onPick={(q) => void send(q)} disabled={!enabled || outOfMessages} />}
        {messages?.map((m, i) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-br-md bg-surface-strong px-3.5 py-2 text-[14px] leading-snug whitespace-pre-wrap">{m.content.text}</p>
            </div>
          ) : (
            <AssistantMessage key={m.id} m={m} trip={trip} animate={typing.has(String(m.id))} onTick={toBottom}>
              {m.content.options?.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {m.content.options.map((o) => (
                    <button
                      key={o}
                      type="button"
                      disabled={busy || i !== lastIndex || outOfMessages}
                      onClick={() => void send(o)}
                      className="h-8 px-3 rounded-full bg-guide-active/50 hover:bg-guide-active text-[13px] text-ink disabled:opacity-50 disabled:hover:bg-guide-active/50"
                    >
                      {o}
                    </button>
                  ))}
                </div>
              ) : null}
            </AssistantMessage>
          ),
        )}
        {busy && <Thinking />}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(text);
        }}
        className="border-t border-line/70 px-3 md:px-4 py-3 space-y-1.5"
      >
        {error && <p className="text-[13px] text-price-up">{error}</p>}
        {!enabled && <p className="text-[13px] text-ink-muted">The assistant isn&apos;t switched on yet.</p>}
        <div className="flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            disabled={!enabled || outOfMessages}
            placeholder={outOfMessages ? "That's today's messages — more tomorrow" : `Ask about ${trip.destination}…`}
            aria-label="Message the assistant"
            className="flex-1 min-w-0 h-10 rounded-full bg-surface px-4 text-[14px] outline-none border border-transparent focus:border-accent-soft disabled:opacity-60"
          />
          <button
            type="submit"
            aria-label="Send"
            disabled={busy || !text.trim() || !enabled || outOfMessages}
            className="grid place-items-center size-10 rounded-full bg-accent text-white hover:bg-accent-hover disabled:opacity-40"
          >
            <ArrowUp weight="bold" className="size-4" />
          </button>
        </div>
        <div className="flex items-center justify-between text-[11px] text-ink-muted px-1">
          <span>{remaining == null ? "" : `${remaining} of ${limit} messages left today`}</span>
          {messages && messages.length > 0 && (
            <button type="button" onClick={clear} className="inline-flex items-center gap-1 hover:text-ink">
              <Trash className="size-3" /> Clear chat
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="rounded-[10px] dashed-accent px-5 py-6 text-[14px] text-ink-muted">{children}</p>;
}

function Welcome({ trip, onPick, disabled }: { trip: Trip; onPick: (q: string) => void; disabled: boolean }) {
  const city = trip.destination;
  const ideas = [`Where should we stay in ${city}?`, `Best dinner spots in ${city}`, `Things to do in ${city} on a rainy day`];
  return (
    <div className="py-6 text-center space-y-4">
      <AiLogo className="size-10 mx-auto block" />
      <div>
        <p className="font-serif text-[22px] leading-tight">Ask about {city}</p>
        <p className="mt-1 text-[13px] text-ink-muted">Places to eat, stay and see — from our City Guides first.</p>
      </div>
      <div className="flex flex-wrap justify-center gap-1.5">
        {ideas.map((q) => (
          <button key={q} type="button" disabled={disabled} onClick={() => onPick(q)} className="h-8 px-3 rounded-full bg-surface hover:bg-white text-[13px] disabled:opacity-50">
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Characters revealed per frame while a reply types out (~250 a second). */
const TYPE_STEP = 4;

/**
 * One assistant reply. A reply that has just arrived types itself out — the intro, then each
 * place's text, with its card appearing once its text is written — then shows its answer chips.
 */
function AssistantMessage({ m, trip, animate, onTick, children }: { m: ChatMessage; trip: Trip; animate: boolean; onTick: () => void; children?: React.ReactNode }) {
  const intro = m.content.text;
  const cards = m.content.cards ?? [];
  const lengths = [intro.length, ...cards.map((c) => c.name.length + 2 + c.summary.length)];
  const total = lengths.reduce((a, b) => a + b, 0);
  const [n, setN] = useState(() => (animate ? 0 : Infinity));
  useEffect(() => {
    if (!animate) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setN(Infinity);
    const t = setInterval(() => {
      setN((x) => {
        const next = x + TYPE_STEP;
        if (next >= total) clearInterval(t);
        return next;
      });
      onTick();
    }, 16);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animate]);

  let offset = lengths[0];
  return (
    <div className="flex gap-2.5">
      <AiLogo className="size-6 mt-1" />
      <div className="min-w-0 flex-1 space-y-2.5">
        <p className="pt-1 text-[14px] leading-snug text-ink">{n >= intro.length ? intro : intro.slice(0, n)}</p>
        {cards.length ? (
          <div className="space-y-5 pt-1">
            {cards.map((c, i) => {
              const reveal = n - offset;
              offset += lengths[i + 1];
              return reveal > 0 ? <PlaceCard key={c.id} card={c} trip={trip} reveal={reveal} /> : null;
            })}
          </div>
        ) : null}
        {n >= total && children}
      </div>
    </div>
  );
}

function findCurated(card: AssistantCard): { place: CuratedPlace; guide: CityGuide } | null {
  if (card.source !== "curated") return null;
  const guide = CITY_GUIDES.find((g) => g.slug === card.guide);
  const place = guide?.sections.flatMap((s) => s.places).find((p) => p.id === card.id);
  return guide && place ? { guide, place } : null;
}

/**
 * A place in the chat: a wide photo with its name (serif) and details over it, like the City
 * Guide cards, and the assistant's summary underneath. The whole card opens the place view.
 */
function PlaceCard({ card, trip, reveal = Infinity }: { card: AssistantCard; trip: Trip; reveal?: number }) {
  const hit = findCurated(card);
  const [open, setOpen] = useState(false);
  // General suggestions open in the same place view (Google photos, reviews and info), without a guide
  const base: CuratedPlace = hit?.place ?? {
    id: card.id,
    name: card.name,
    tagline: card.tagline,
    neighbourhood: card.area,
    mapsQuery: card.mapsQuery ?? card.name,
    lat: card.lat ?? 0,
    lng: card.lng ?? 0,
    category: card.category as ActivityCategory,
    ...(card.price ? { priceLevel: card.price } : {}),
  };
  const guide: CuratedGuide = hit?.guide ?? { slug: "assistant", city: trip.destination, country: "", aliases: [], intro: "", sections: [] };
  const kind = hit ? kindOfPlace(hit.guide, hit.place) : card.category === "food" ? "food" : "explore";
  const place = useCuratedPlace(base);
  const photo = useCuratedCover(place, 800);
  // Hotels save to the trip's Stays (with the live price when there is one); the rest to Food / Explore
  const saved = useTripsWithPlace(place.name).includes(trip.id);
  const addAs: Partial<PlaceToAdd> = {
    stay: card.kind === "stay" || (hit ? isCuratedStay(hit.guide, hit.place.id) : false),
    area: card.area,
    city: guide.city,
    nightly: card.nightly,
    total: card.total,
    currency: card.currency,
    bookingUrl: card.link,
    rating: card.rating,
    reviews: card.reviews,
    imageUrl: photo,
  };
  // While the reply types out: how much of "Name: summary" is showing, and the card once it's written
  const name = place.name;
  const shownName = name.slice(0, reveal);
  const shownSummary = card.summary.slice(0, Math.max(0, reveal - name.length - 2));
  const written = reveal >= name.length + 2 + card.summary.length;
  const level = card.price ?? place.priceLevel;
  // Hotels with a live price show it per night; everything else its price level ($–$$$$)
  const nightly = card.nightly && card.currency ? `${currencySymbol(card.currency)}${card.nightly.toLocaleString("en-GB")} / night` : null;
  const details = [place.tagline, place.neighbourhood, nightly ?? (level ? "$".repeat(level) : null)].filter(Boolean).join(" · ");
  const totalNote =
    card.total && card.currency && card.nights
      ? `${currencySymbol(card.currency)}${card.total.toLocaleString("en-GB")} for ${card.nights} night${card.nights === 1 ? "" : "s"} on your dates`
      : undefined;

  return (
    <div className="space-y-2">
      <p className="text-[14px] leading-snug text-ink">
        {card.link ? (
          <a href={card.link} target="_blank" rel="noopener noreferrer sponsored" className="font-semibold underline decoration-ink/30 underline-offset-2 hover:decoration-ink">
            {shownName}
          </a>
        ) : (
          <b className="font-semibold">{shownName}</b>
        )}
        {reveal > name.length && <b className="font-semibold">:</b>} {shownSummary}
      </p>
      {written && (
        <div className="group relative w-full sm:w-1/2 animate-[fade-in_400ms_ease-out]">
          <div
            role="button"
            tabIndex={0}
            aria-label={`Open ${place.name}`}
            onClick={(e) => !(e.target as HTMLElement).closest("button") && setOpen(true)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && e.target === e.currentTarget && (e.preventDefault(), setOpen(true))}
            className="rounded-2xl overflow-hidden cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-guide-active transition-shadow hover:shadow-md"
          >
            <div className="film-grain relative aspect-[16/9] overflow-hidden bg-guide-card">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt="" className="absolute inset-0 size-full object-cover film-photo transition-transform duration-500 group-hover:scale-[1.04]" />
              ) : (
                <span className="absolute inset-0 grid place-items-center text-guide-ink/15">
                  {kind === "food" ? <ForkKnife weight="fill" className="size-10" /> : <MapPin weight="fill" className="size-10" />}
                </span>
              )}
              <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-black/5" aria-hidden />
              <div className="absolute inset-x-0 bottom-0 px-4 pb-3 text-guide-ink">
                <p className="font-serif text-[20px] leading-[1.1]">{place.name}</p>
                <p className="mt-1 flex items-center gap-1.5 text-[12px] text-guide-ink/85 min-w-0">
                  <span className="truncate" title={totalNote}>
                    {details}
                  </span>
                  {card.rating ? (
                    <span className="shrink-0 inline-flex items-center gap-0.5" title={card.reviews ? `${card.reviews.toLocaleString("en-GB")} Google reviews` : "Google rating"}>
                      · <Star weight="fill" className="size-3" /> {card.rating.toFixed(1)}
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              saved ? removePlaceFromTrip(trip.id, place.name) : addPlaceToTrip(trip.id, { name: place.name, category: card.category as ActivityCategory, lat: card.lat, lng: card.lng, ...addAs })
            }
            title={saved ? "Remove from trip" : "Add to trip"}
            aria-label={saved ? "Remove from trip" : "Add to trip"}
            className={clsx(
              "absolute top-2.5 right-2.5 grid place-items-center size-8 rounded-full shadow transition-colors",
              saved ? "bg-guide-active text-ink" : "bg-guide-ink/90 text-ink hover:bg-white",
            )}
          >
            {saved ? <Check weight="bold" className="size-4" /> : <Plus weight="bold" className="size-4" />}
          </button>
        </div>
      )}
      {open && (
        <PlaceModal
          place={hit?.place ?? base}
          guide={guide}
          kind={kind}
          general={!hit}
          addAs={addAs}
          curate={false}
          photoPick={hit?.place.photo}
          EmptyIcon={kind === "food" ? ForkKnife : MapPin}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
