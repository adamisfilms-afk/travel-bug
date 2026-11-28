"use client";

import { ArrowUp, Check, ForkKnife, MapPin, Plus, Sparkle, Star, Trash } from "@phosphor-icons/react";
import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { PlaceModal } from "@/components/PlaceModal";
import type { AssistantCard, AssistantReply, ChatMessage } from "@/lib/assistant/types";
import { useAccountInfo } from "@/lib/auth";
import { CITY_GUIDES, kindOfPlace, type CityGuide } from "@/lib/curated/city-guides";
import { useCuratedCover } from "@/lib/curated/cover";
import { useCuratedPlace } from "@/lib/curated/overrides";
import type { CuratedPlace } from "@/lib/curated/types";
import { useStore } from "@/lib/store";
import type { ActivityCategory, Trip } from "@/lib/types";

/**
 * The planner's Assistant tab: a chat saved with the trip. It asks a short question or two,
 * then shows places as compact cards — curated City Guide picks first, general suggestions
 * (marked as such) only when the guides are thin. Cards can be added to the trip.
 */
export function TripAssistant({ trip, initialAsk, onAsked }: { trip: Trip; initialAsk?: string | null; onAsked?: () => void }) {
  const account = useAccountInfo();
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [limit, setLimit] = useState(10);
  const [enabled, setEnabled] = useState(true);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const asked = useRef(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/trips/${encodeURIComponent(trip.id)}/assistant`);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessages([]);
      return setError(d.error ?? "Couldn't load the chat.");
    }
    setMessages(d.messages ?? []);
    setRemaining(d.remaining ?? null);
    setLimit(d.limit ?? 10);
    setEnabled(d.enabled !== false);
  }, [trip.id]);

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
          res = await fetch(`/api/trips/${encodeURIComponent(trip.id)}/assistant`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ text: t }),
          });
          if (res.status !== 404) break;
          await new Promise((r) => setTimeout(r, 1200));
        }
        const d = (await res!.json().catch(() => ({}))) as Partial<AssistantReply> & { error?: string };
        if (!res!.ok) throw Object.assign(new Error(d.error ?? "Something went wrong."), { remaining: d.remaining });
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
    [busy, trip.id],
  );

  // A question typed on the home page: ask it once the chat has loaded
  useEffect(() => {
    if (!initialAsk || asked.current || messages === null) return;
    asked.current = true;
    onAsked?.();
    void send(initialAsk);
  }, [initialAsk, messages, send, onAsked]);

  // Keep the latest message in view
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

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
    <div className="flex flex-col rounded-[10px] dashed-accent h-[min(640px,calc(100svh-220px))] lg:h-[calc(100vh-180px)] min-h-[420px]">
      <div ref={listRef} className="flex-1 overflow-y-auto no-scrollbar px-4 md:px-5 py-4 space-y-4">
        {messages === null && <div className="h-10 w-2/3 rounded-xl bg-surface animate-pulse" />}
        {messages?.length === 0 && !busy && <Welcome trip={trip} onPick={(q) => void send(q)} disabled={!enabled || outOfMessages} />}
        {messages?.map((m, i) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-br-md bg-surface-strong px-3.5 py-2 text-[14px] leading-snug whitespace-pre-wrap">{m.content.text}</p>
            </div>
          ) : (
            <div key={m.id} className="space-y-2.5">
              <p className="flex gap-2 text-[14px] leading-snug">
                <Sparkle weight="fill" className="size-4 mt-0.5 shrink-0 text-accent-ink" />
                <span>{m.content.text}</span>
              </p>
              {m.content.options?.length ? (
                <div className="flex flex-wrap gap-1.5 pl-6">
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
              {m.content.cards?.length ? (
                <div className="space-y-2">
                  {m.content.cards.map((c) => (
                    <PlaceCard key={c.id} card={c} trip={trip} />
                  ))}
                </div>
              ) : null}
            </div>
          ),
        )}
        {busy && (
          <p className="flex items-center gap-2 text-[13px] text-ink-muted">
            <Sparkle weight="fill" className="size-4 text-accent-ink animate-pulse" /> Looking through the guides…
          </p>
        )}
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
      <Sparkle weight="fill" className="size-7 mx-auto text-accent-ink" />
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

const PRICE = ["", "$", "$$", "$$$", "$$$$"];

function findCurated(card: AssistantCard): { place: CuratedPlace; guide: CityGuide } | null {
  if (card.source !== "curated") return null;
  const guide = CITY_GUIDES.find((g) => g.slug === card.guide);
  const place = guide?.sections.flatMap((s) => s.places).find((p) => p.id === card.id);
  return guide && place ? { guide, place } : null;
}

/** A compact horizontal card: photo, name, details, summary, add-to-trip. */
function PlaceCard({ card, trip }: { card: AssistantCard; trip: Trip }) {
  const hit = findCurated(card);
  const [open, setOpen] = useState(false);
  // For photos: curated places use their curated cover; general suggestions their Google listing
  const base: CuratedPlace = hit?.place ?? {
    id: card.id,
    name: card.name,
    tagline: card.tagline,
    neighbourhood: card.area,
    mapsQuery: card.mapsQuery ?? card.name,
    lat: card.lat ?? 0,
    lng: card.lng ?? 0,
    category: card.category as ActivityCategory,
  };
  const place = useCuratedPlace(base);
  const photo = useCuratedCover(place, 240);
  const activities = useStore((s) => s.activities);
  const addActivity = useStore((s) => s.addActivity);
  const removeActivity = useStore((s) => s.removeActivity);
  const saved = activities.find((a) => a.tripId === trip.id && a.name.toLowerCase() === place.name.toLowerCase());
  const details = [place.tagline, place.neighbourhood, card.price ? PRICE[card.price] : null].filter(Boolean).join(" · ");

  return (
    <div className="flex gap-3 rounded-xl bg-surface p-2.5 pr-3">
      <button
        type="button"
        onClick={() => (hit ? setOpen(true) : window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(card.mapsQuery ?? card.name)}`, "_blank", "noopener"))}
        className="relative size-[72px] shrink-0 overflow-hidden rounded-lg bg-surface-strong"
        aria-label={`Open ${place.name}`}
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="size-full object-cover" />
        ) : (
          <span className="grid size-full place-items-center text-ink/30">{card.category === "food" ? <ForkKnife className="size-5" /> : <MapPin className="size-5" />}</span>
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <button type="button" onClick={() => (hit ? setOpen(true) : undefined)} className={clsx("min-w-0 flex-1 text-left", hit && "hover:underline underline-offset-2")}>
            <span className="block text-[15px] font-medium leading-tight truncate">{place.name}</span>
          </button>
          <button
            type="button"
            onClick={() =>
              saved ? removeActivity(saved.id) : addActivity(trip.id, { name: place.name, category: card.category as ActivityCategory, lat: card.lat, lng: card.lng, place: place.name })
            }
            title={saved ? "Remove from trip" : "Add to trip"}
            aria-label={saved ? "Remove from trip" : "Add to trip"}
            className={clsx(
              "grid place-items-center size-7 shrink-0 rounded-full transition-colors",
              saved ? "bg-guide-active text-ink" : "bg-accent text-white hover:bg-accent-hover",
            )}
          >
            {saved ? <Check weight="bold" className="size-3.5" /> : <Plus weight="bold" className="size-3.5" />}
          </button>
        </div>
        <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-ink-muted min-w-0">
          <span
            className={clsx(
              "shrink-0 rounded-full px-1.5 py-px text-[10px] uppercase tracking-wider",
              card.source === "curated" ? "bg-guide-active text-ink" : "border border-ink/15 text-ink-muted",
            )}
          >
            {card.source === "curated" ? "Curated" : "Suggestion"}
          </span>
          <span className="truncate">{details}</span>
          {card.rating ? (
            <span className="shrink-0 inline-flex items-center gap-0.5">
              <Star weight="fill" className="size-3" /> {card.rating.toFixed(1)}
            </span>
          ) : null}
        </p>
        <p className="mt-1 text-[13px] leading-snug text-ink/85 line-clamp-3 md:line-clamp-2">{card.summary}</p>
      </div>
      {open && hit && (
        <PlaceModal
          place={hit.place}
          guide={hit.guide}
          kind={kindOfPlace(hit.guide, hit.place)}
          curate={false}
          photoPick={hit.place.photo}
          EmptyIcon={kindOfPlace(hit.guide, hit.place) === "food" ? ForkKnife : MapPin}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
