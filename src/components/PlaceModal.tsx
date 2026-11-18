"use client";

import { ArrowSquareOut, CaretLeft, CaretRight, Clock, Globe, MapPin, Plus, Star, Trash, X, type Icon } from "@phosphor-icons/react";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CuratedGuide, CuratedPlace } from "@/lib/curated/types";
import { useStore } from "@/lib/store";
import { AddToTripButton } from "./trips";

// ---------------------------------------------------------------------------
// Google details (session cache so reopening a place costs nothing)
// ---------------------------------------------------------------------------

interface Details {
  rating: number | null;
  ratingCount: number | null;
  priceLevel: number | null;
  mapsUrl: string | null;
  website: string | null;
  hours: string[] | null;
  summary: { text: string; disclosure: string; reviewsUrl: string | null; flagUrl: string | null } | null;
  reviews: { rating: number | null; when: string; text: string; author: string; authorUrl: string | null; authorPhoto: string | null; url: string | null }[];
  photos: { name: string; author: string | null; authorUrl: string | null }[];
}

const detailsCache = new Map<string, Details | "unavailable">();
const mediaCache = new Map<string, string>();

function useDetails(q: string) {
  const [state, setState] = useState<Details | "loading" | "unavailable">(() => detailsCache.get(q) ?? "loading");
  useEffect(() => {
    const hit = detailsCache.get(q);
    if (hit) return setState(hit);
    let cancelled = false;
    setState("loading");
    fetch(`/api/curated/details?q=${encodeURIComponent(q)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Details) => {
        detailsCache.set(q, d);
        if (!cancelled) setState(d);
      })
      .catch(() => {
        detailsCache.set(q, "unavailable");
        if (!cancelled) setState("unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [q]);
  return state;
}

const fmtCount = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "")}k` : String(n));

// ---------------------------------------------------------------------------
// Photo carousel
// ---------------------------------------------------------------------------

const PLACEHOLDERS = ["bg-ph-mustard", "bg-ph-sky", "bg-ph-sage", "bg-ph-lime"];

function Slide({ name, alt }: { name: string; alt: string }) {
  const [url, setUrl] = useState<string | null>(() => mediaCache.get(name) ?? null);
  useEffect(() => {
    if (mediaCache.has(name)) return setUrl(mediaCache.get(name)!);
    let cancelled = false;
    fetch(`/api/curated/media?name=${encodeURIComponent(name)}&w=1600`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { url: string }) => {
        mediaCache.set(name, d.url);
        if (!cancelled) setUrl(d.url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [name]);
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} className="absolute inset-0 size-full object-cover" draggable={false} />
  ) : (
    <span className="absolute inset-0 animate-pulse bg-line/40" />
  );
}

function Carousel({ photos, alt, EmptyIcon }: { photos: Details["photos"] | null; alt: string; EmptyIcon: Icon }) {
  const slides = photos?.length ? photos : null;
  const count = slides?.length ?? 4; // placeholders until real photos exist
  const [i, setI] = useState(0);
  const touch = useRef<number | null>(null);
  const go = (d: number) => setI((n) => (n + d + count) % count);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  return (
    <div
      className="group/c relative h-[240px] sm:h-[352px] md:h-[400px] rounded-2xl overflow-hidden select-none"
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current == null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        touch.current = null;
      }}
    >
      {/* Slides sit side by side and slide horizontally */}
      <div className="absolute inset-0 flex transition-transform duration-300 ease-out" style={{ transform: `translateX(-${i * 100}%)` }}>
        {Array.from({ length: count }, (_, n) => (
          <div key={n} className={clsx("relative shrink-0 w-full h-full", PLACEHOLDERS[n % PLACEHOLDERS.length])}>
            {slides ? (
              Math.abs(n - i) <= 1 && <Slide name={slides[n].name} alt={`${alt} — photo ${n + 1}`} />
            ) : (
              <span className="absolute inset-0 grid place-items-center text-ink/20">
                <EmptyIcon weight="fill" className="size-12" />
              </span>
            )}
          </div>
        ))}
      </div>
      {count > 1 && (
        <>
          {(["prev", "next"] as const).map((dir) => (
            <button
              key={dir}
              type="button"
              aria-label={dir === "prev" ? "Previous photo" : "Next photo"}
              onClick={() => go(dir === "next" ? 1 : -1)}
              className={clsx(
                "absolute top-1/2 -translate-y-1/2 grid place-items-center size-8 rounded-full bg-white/90 text-ink shadow transition-opacity",
                "opacity-100 md:opacity-0 md:group-hover/c:opacity-100 focus-visible:opacity-100",
                dir === "prev" ? "left-3" : "right-3",
              )}
            >
              {dir === "prev" ? <CaretLeft weight="bold" className="size-4" /> : <CaretRight weight="bold" className="size-4" />}
            </button>
          ))}
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {Array.from({ length: count }, (_, n) => (
              <button
                key={n}
                type="button"
                aria-label={`Photo ${n + 1}`}
                onClick={() => setI(n)}
                className={clsx("size-2 rounded-full shadow transition-transform", n === i ? "bg-white scale-110" : "bg-white/55 hover:bg-white/80")}
              />
            ))}
          </div>
          <span className="absolute top-2.5 right-2.5 rounded-full bg-ink/60 text-white text-[11px] px-2 py-0.5 tabular-nums">
            {i + 1}/{count}
          </span>
        </>
      )}
      {slides?.[i]?.author && <span className="sr-only">Photo by {slides[i].author} on Google</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Social embeds
// ---------------------------------------------------------------------------

/** Embed URL + frame size for Instagram posts/Reels, TikTok videos and YouTube (incl. Shorts). */
export function socialEmbed(url: string): { src: string; platform: string; w: number; h: number } | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host.endsWith("instagram.com")) {
      const m = u.pathname.match(/^\/(p|reel|reels|tv)\/([\w-]+)/);
      if (m) return { src: `https://www.instagram.com/${m[1] === "reels" ? "reel" : m[1]}/${m[2]}/embed/`, platform: "Instagram", w: 328, h: 560 };
    }
    if (host.endsWith("tiktok.com")) {
      const m = u.pathname.match(/\/video\/(\d+)/);
      if (m) return { src: `https://www.tiktok.com/embed/v2/${m[1]}`, platform: "TikTok", w: 325, h: 575 };
    }
    if (host === "youtu.be") return { src: `https://www.youtube.com/embed/${u.pathname.slice(1)}`, platform: "YouTube", w: 315, h: 560 };
    if (host.endsWith("youtube.com")) {
      const id = u.pathname.match(/^\/shorts\/([\w-]+)/)?.[1] ?? u.searchParams.get("v");
      if (id) return { src: `https://www.youtube.com/embed/${id}`, platform: "YouTube", w: 315, h: 560 };
    }
  } catch {
    /* not a URL */
  }
  return null;
}

const EMBED_SCALE = 0.8;

function SocialRow({
  posts,
  removable,
  name,
  curate,
  onAdd,
  onRemove,
}: {
  posts: string[];
  /** Posts added in this browser (only these can be removed here; guide posts are edited in the data). */
  removable: string[];
  name: string;
  curate: boolean;
  onAdd: (url: string) => void;
  onRemove: (url: string) => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const embeds = posts.map((u) => ({ url: u, e: socialEmbed(u) })).filter((x) => x.e);
  return (
    <section className="space-y-3">
      <h3 className="text-[21px] leading-tight">On social</h3>
      {curate && (
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!socialEmbed(text.trim())) return setError("Paste an Instagram post/Reel, TikTok video or YouTube link.");
            onAdd(text.trim());
            setText("");
            setError("");
          }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste an Instagram, TikTok or YouTube link…"
            className="h-10 flex-1 min-w-60 rounded-lg bg-white px-3 text-[14px] outline-none border border-line focus:border-accent-soft"
          />
          <button type="submit" className="h-10 px-4 rounded-lg bg-ink text-white text-[14px] hover:bg-accent inline-flex items-center gap-1">
            <Plus weight="bold" className="size-3.5" /> Add post
          </button>
          {error && <p className="w-full text-[13px] text-price-up">{error}</p>}
        </form>
      )}
      <div className="-mx-5 md:-mx-11 px-5 md:px-11 scroll-px-5 md:scroll-px-11 flex gap-3 overflow-x-auto no-scrollbar pb-1 snap-x">
        {embeds.map(({ url, e }) => (
          <div
            key={url}
            className="relative shrink-0 snap-start rounded-xl overflow-hidden bg-white border border-line"
            style={{ width: e!.w * EMBED_SCALE, height: e!.h * EMBED_SCALE }}
          >
            {/* Embeds have a minimum width (Instagram ~326px), so render full size and scale down */}
            <iframe
              src={e!.src}
              title={`${e!.platform} post about ${name}`}
              loading="lazy"
              allow="autoplay; encrypted-media; picture-in-picture; clipboard-write"
              allowFullScreen
              className="absolute top-0 left-0 border-0 origin-top-left"
              style={{ width: e!.w, height: e!.h, transform: `scale(${EMBED_SCALE})` }}
            />
            {curate && removable.includes(url) && (
              <button
                type="button"
                aria-label="Remove post"
                onClick={() => onRemove(url)}
                className="absolute top-2 left-2 z-10 rounded-full bg-white/95 p-1.5 shadow text-ink/70 hover:text-price-up"
              >
                <Trash className="size-3.5" />
              </button>
            )}
          </div>
        ))}
        {embeds.length === 0 &&
          ["Instagram", "TikTok", "Instagram"].map((p, i) => (
            <div key={i} className="shrink-0 w-[208px] h-[320px] rounded-xl border border-dashed border-line bg-white/50 grid place-items-center text-center px-5">
              <p className="text-[12px] text-ink-muted">
                {p} posts featuring {name} will appear here{curate ? " — paste a link above to add one." : "."}
              </p>
            </div>
          ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

const socialKey = (kind: string, slug: string) => `travel-bug:social-picks:${kind}:${slug}`;

export function PlaceModal({
  place,
  guide,
  kind,
  curate,
  photoPick,
  EmptyIcon,
  onClose,
}: {
  place: CuratedPlace;
  guide: CuratedGuide;
  kind: "food" | "explore";
  curate: boolean;
  /** Curator's chosen photo (index in Google's list) — shown first. */
  photoPick?: number;
  EmptyIcon: Icon;
  onClose: () => void;
}) {
  const details = useDetails(place.mapsQuery);
  const d = typeof details === "object" ? details : null;
  const activities = useStore((s) => s.activities);
  const addActivity = useStore((s) => s.addActivity);
  const addedTo = activities.filter((a) => a.name === place.name).map((a) => a.tripId);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Social posts: guide data + this browser's curated additions
  const [extra, setExtra] = useState<Record<string, string[]>>({});
  useEffect(() => {
    try {
      setExtra(JSON.parse(localStorage.getItem(socialKey(kind, guide.slug)) ?? "{}"));
    } catch {
      /* ignore */
    }
  }, [kind, guide.slug]);
  const saveExtra = (next: Record<string, string[]>) => {
    setExtra(next);
    try {
      localStorage.setItem(socialKey(kind, guide.slug), JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };
  const posts = [...(place.social ?? []), ...(extra[place.id] ?? [])];

  // Escape closes; lock page scroll while open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // Curated photo first, then the rest in Google's order
  const photos = d?.photos?.length
    ? photoPick != null && d.photos[photoPick]
      ? [d.photos[photoPick], ...d.photos.filter((_, n) => n !== photoPick)]
      : d.photos
    : null;
  const price = place.priceLevel ?? d?.priceLevel ?? null;

  if (typeof document === "undefined") return null;
  // Portal to <body> so the overlay isn't affected by the page's layout (margins, stacking)
  return createPortal(
    <div className="fixed inset-y-0 right-0 left-[64px] md:left-[84px] z-[60] flex items-start justify-center overflow-y-auto bg-ink/35 backdrop-blur-md p-3 sm:p-6 md:p-10" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={place.name}
        onMouseDown={(e) => e.stopPropagation()}
        className="relative w-full max-w-[888px] rounded-2xl bg-surface border border-line shadow-2xl px-5 md:px-11 py-7 md:py-10 space-y-6"
      >
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <AddToTripButton
            compact
            tone="dark"
            addedTo={addedTo}
            defaults={{ destination: guide.city }}
            onAdd={(tripId) => addActivity(tripId, { name: place.name, category: place.category, lat: place.lat, lng: place.lng, place: place.name })}
          />
          <button ref={closeRef} type="button" aria-label="Close" onClick={onClose} className="grid place-items-center size-8 rounded-full hover:bg-line/50">
            <X weight="bold" className="size-4" />
          </button>
        </div>

        <header className="pr-24">
          <h2 className="text-[30px] md:text-[38px] leading-[1.05] font-extrabold tracking-tight">{place.name}</h2>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-6 gap-y-1 text-[13px]">
            <span>
              {place.neighbourhood}, {guide.city}, {guide.country}
            </span>
            <span>{place.tagline}</span>
            {price != null && price > 0 && (
              <span aria-label={`Price level ${price} of 4`}>
                {"$".repeat(price)}
                <span className="text-ink/25">{"$".repeat(4 - price)}</span>
              </span>
            )}
          </div>
        </header>

        <Carousel photos={photos} alt={place.name} EmptyIcon={EmptyIcon} />

        {place.description && <p className="text-[14px] leading-relaxed max-w-[620px]">{place.description}</p>}

        <section className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h3 className="text-[21px] leading-tight">Reviews</h3>
            <div className="flex flex-wrap gap-4 text-[13px]">
              {d?.website && (
                <a href={d.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent-ink underline underline-offset-2">
                  <Globe className="size-3.5" /> Website
                </a>
              )}
              <a
                href={d?.mapsUrl ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.mapsQuery)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-accent-ink underline underline-offset-2"
              >
                <MapPin className="size-3.5" /> Open in Google Maps
              </a>
            </div>
          </div>

          {details === "loading" && <div className="h-20 rounded-xl bg-line/30 animate-pulse" />}
          {details === "unavailable" && (
            <p className="text-[14px] text-ink-muted">Google ratings and reviews will appear here once the Google Maps key is set up.</p>
          )}
          {d && (
            <>
              {d.rating != null && (
                <p className="flex items-center gap-2 text-[14px]">
                  <Star weight="fill" className="size-4" />
                  <span className="font-semibold">{d.rating.toFixed(1)}</span>
                  {d.ratingCount != null && <span className="text-ink-muted">{fmtCount(d.ratingCount)} reviews on Google</span>}
                </p>
              )}
              {d.summary && (
                <div className="rounded-xl bg-white/70 border border-line p-3.5 max-w-[620px]">
                  <p className="text-[13px] leading-relaxed">{d.summary.text}</p>
                  <p className="mt-2 text-[12px] text-ink-muted flex flex-wrap gap-x-3">
                    <span>{d.summary.disclosure}</span>
                    {d.summary.reviewsUrl && (
                      <a href={d.summary.reviewsUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                        Read reviews on Google
                      </a>
                    )}
                    {d.summary.flagUrl && (
                      <a href={d.summary.flagUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                        Report
                      </a>
                    )}
                  </p>
                </div>
              )}
              {d.reviews.length > 0 && (
                <div className="-mx-5 md:-mx-11 px-5 md:px-11 scroll-px-5 md:scroll-px-11 flex gap-3 overflow-x-auto no-scrollbar pb-1 snap-x">
                  {d.reviews.map((r, n) => (
                    <figure key={n} className="shrink-0 snap-start w-[240px] rounded-xl bg-white/70 border border-line p-3.5 space-y-1.5">
                      <div className="flex items-center gap-2">
                        {r.authorPhoto && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.authorPhoto} alt="" className="size-7 rounded-full" />
                        )}
                        <a href={r.authorUrl ?? undefined} target="_blank" rel="noopener noreferrer" className="text-[13px] font-medium truncate hover:underline">
                          {r.author}
                        </a>
                      </div>
                      <p className="flex items-center gap-1 text-[12px] text-ink-muted">
                        {r.rating != null &&
                          Array.from({ length: 5 }, (_, k) => (
                            <Star key={k} weight={k < r.rating! ? "fill" : "regular"} className="size-3 text-ink" />
                          ))}
                        <span className="ml-1">{r.when}</span>
                      </p>
                      <blockquote className="text-[12.5px] leading-relaxed line-clamp-6">{r.text}</blockquote>
                      {r.url && (
                        <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] text-ink-muted hover:underline">
                          On Google <ArrowSquareOut className="size-3" />
                        </a>
                      )}
                    </figure>
                  ))}
                </div>
              )}
              {d.hours && (
                <details className="text-[13px] text-ink-muted">
                  <summary className="inline-flex items-center gap-1.5">
                    <Clock className="size-3.5" /> Opening hours
                  </summary>
                  <ul className="mt-2 space-y-0.5 pl-5">
                    {d.hours.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </section>

        <SocialRow
          posts={posts}
          removable={extra[place.id] ?? []}
          name={place.name}
          curate={curate}
          onAdd={(url) => saveExtra({ ...extra, [place.id]: [...(extra[place.id] ?? []), url] })}
          onRemove={(url) => saveExtra({ ...extra, [place.id]: (extra[place.id] ?? []).filter((u) => u !== url) })}
        />
      </div>
    </div>,
    document.body,
  );
}
