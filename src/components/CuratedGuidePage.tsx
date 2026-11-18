"use client";

import { CaretLeft, CaretRight, Copy, MagnifyingGlass, type Icon } from "@phosphor-icons/react";
import clsx from "clsx";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AddToTripButton } from "@/components/trips";
import { PageTitle, SectionTitle, useClickOutside } from "@/components/ui";
import type { CuratedGuide, CuratedPlace } from "@/lib/curated/types";
import { useStore } from "@/lib/store";

const PLACEHOLDERS = ["bg-ph-mustard", "bg-ph-sky", "bg-ph-sage", "bg-ph-lime"];

interface Photo {
  url: string;
  index: number;
  count: number;
  attribution: { name: string; uri?: string } | null;
}

// --- Photo cache: photos already looked up this session, so returning to a guide is instant
// and doesn't repeat Google requests ------------------------------------------------------------

const photoCache = new Map<string, Photo | "failed">();
const photoKey = (q: string, pick?: number) => `${q}|${pick ?? "auto"}`;

// --- Curation picks (?curate=1): which Google photo to use per place --------------------------

const picksKey = (kind: string, slug: string) => `travel-bug:photo-picks:${kind}:${slug}`;

function readPicks(kind: string, slug: string): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(picksKey(kind, slug)) ?? "{}");
  } catch {
    return {};
  }
}

function writePicks(kind: string, slug: string, picks: Record<string, number>) {
  try {
    localStorage.setItem(picksKey(kind, slug), JSON.stringify(picks));
  } catch {
    /* ignore */
  }
}

// --- Card ---------------------------------------------------------------------------------------

function PlaceCard({
  place,
  index,
  guide,
  curate,
  pick,
  onPick,
  EmptyIcon,
}: {
  place: CuratedPlace;
  index: number;
  guide: CuratedGuide;
  curate: boolean;
  /** Photo index chosen by a curator (data or this browser's picks); undefined = automatic. */
  pick?: number;
  onPick: (i: number) => void;
  EmptyIcon: Icon;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const cached = photoCache.get(photoKey(place.mapsQuery, pick));
  const [visible, setVisible] = useState(!!cached);
  const [photo, setPhoto] = useState<Photo | null>(cached && cached !== "failed" ? cached : null);
  const [failed, setFailed] = useState(cached === "failed");
  const activities = useStore((s) => s.activities);
  const addActivity = useStore((s) => s.addActivity);
  const addedTo = activities.filter((a) => a.name === place.name).map((a) => a.tripId);

  // Load the photo once the card is near the viewport
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setVisible(true), io.disconnect()), { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const key = photoKey(place.mapsQuery, pick);
    const hit = photoCache.get(key);
    if (hit) {
      setPhoto(hit === "failed" ? null : hit);
      setFailed(hit === "failed");
      return;
    }
    let cancelled = false;
    const qs = new URLSearchParams({ q: place.mapsQuery, w: "800" });
    if (pick != null) qs.set("index", String(pick));
    fetch(`/api/curated/photo?${qs}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Photo) => {
        photoCache.set(key, d);
        if (cancelled) return;
        setPhoto(d);
        setFailed(false);
      })
      .catch(() => {
        photoCache.set(key, "failed");
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, place.mapsQuery, pick]);

  const step = (d: number) => {
    if (!photo) return;
    onPick((photo.index + d + photo.count) % photo.count);
  };

  return (
    <div ref={ref} className="group shrink-0 w-[230px] md:w-[270px] snap-start">
      {/* Image (clipped) with the add-to-trip button outside the clip so its menu can open */}
      <div className="relative">
        <div className={clsx("relative h-[170px] md:h-[190px] rounded-2xl overflow-hidden", PLACEHOLDERS[index % PLACEHOLDERS.length])}>
          {photo && !failed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo.url}
              alt={place.name}
              // Photographer credit kept only as a hover tooltip (not shown on screen)
              title={photo.attribution ? `Photo: ${photo.attribution.name} · Google` : undefined}
              loading="lazy"
              onError={() => setFailed(true)}
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <span className="absolute inset-0 grid place-items-center text-ink/25">
              <EmptyIcon weight="fill" className="size-10" />
            </span>
          )}
          {curate && photo && photo.count > 1 && (
            <>
              <button type="button" aria-label="Previous photo" onClick={() => step(-1)} className="absolute left-2 top-1/2 -translate-y-1/2 grid place-items-center size-8 rounded-full bg-white/90 shadow">
                <CaretLeft weight="bold" className="size-4" />
              </button>
              <button type="button" aria-label="Next photo" onClick={() => step(1)} className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center size-8 rounded-full bg-white/90 shadow">
                <CaretRight weight="bold" className="size-4" />
              </button>
              <span className="absolute bottom-2 left-2 rounded-full bg-ink/70 text-white text-[11px] px-2 py-0.5 tabular-nums">
                Photo {photo.index + 1}/{photo.count}
                {pick != null ? " · picked" : " · auto"}
              </span>
            </>
          )}
        </div>
        <div
          className={clsx(
            "absolute top-2 right-2 transition-opacity",
            addedTo.length ? "opacity-100" : "opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100",
          )}
        >
          <AddToTripButton
            compact
            tone="dark"
            addedTo={addedTo}
            defaults={{ destination: guide.city }}
            onAdd={(tripId) =>
              addActivity(tripId, { name: place.name, category: place.category, lat: place.lat, lng: place.lng, place: place.name })
            }
          />
        </div>
      </div>
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.mapsQuery)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block mt-2.5 px-0.5"
      >
        <p className="text-[15px] font-semibold leading-tight truncate hover:underline underline-offset-2">{place.name}</p>
        <p className="text-[13px] text-ink-muted truncate">
          {place.tagline} · {place.neighbourhood}
        </p>
      </a>
    </div>
  );
}

// --- City search --------------------------------------------------------------------------------

function CitySearch({
  value,
  match,
  placeholder,
  onPick,
}: {
  value: string;
  match: (q: string) => CuratedGuide[];
  placeholder: string;
  onPick: (g: CuratedGuide) => void;
}) {
  const [text, setText] = useState(value);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));
  useEffect(() => setText(value), [value]);

  const term = text.trim();
  const matches = match(term);
  const pick = (g: CuratedGuide) => {
    setText(g.city);
    setOpen(false);
    onPick(g);
  };

  return (
    <div ref={ref} className="relative w-full max-w-[520px]">
      <label className="flex items-center gap-3 h-11 px-4 rounded-[10px] bg-surface border border-white/70">
        <MagnifyingGlass className="size-4 text-ink-muted shrink-0" />
        <input
          aria-label="Search a city"
          className="flex-1 min-w-0 bg-transparent outline-none text-[14px] placeholder:text-ink-muted"
          placeholder={placeholder}
          value={text}
          onFocus={(e) => {
            e.target.select();
            setOpen(true);
          }}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            setHi(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") setHi((h) => Math.min(h + 1, matches.length - 1));
            else if (e.key === "ArrowUp") setHi((h) => Math.max(h - 1, 0));
            else if (e.key === "Enter" && matches[hi]) {
              e.preventDefault();
              pick(matches[hi]);
            } else if (e.key === "Escape") setOpen(false);
          }}
        />
      </label>
      {open && term.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-2 z-30 rounded-xl bg-surface-strong shadow-lg border border-line py-2 text-[14px]">
          {matches.map((g, i) => (
            <button
              key={g.slug}
              type="button"
              onMouseEnter={() => setHi(i)}
              onClick={() => pick(g)}
              className={clsx("w-full text-left px-4 py-2 flex items-center justify-between gap-3", i === hi && "bg-surface")}
            >
              <span>
                <span className="font-medium">{g.city}</span>
                <span className="text-ink-muted"> · {g.country}</span>
              </span>
              <span className="text-[12px] text-ink-muted">{g.sections.reduce((n, s) => n + s.places.length, 0)} places</span>
            </button>
          ))}
          {matches.length === 0 && (
            <p className="px-4 py-2 text-ink-muted">
              Curated recommendations for <span className="text-ink font-medium">“{term}”</span> are coming soon.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// --- Page ---------------------------------------------------------------------------------------

export function CuratedGuidePage({
  kind,
  title,
  searchPlaceholder,
  prompt,
  findGuide,
  match,
  EmptyIcon,
}: {
  kind: "food" | "explore";
  title: string;
  searchPlaceholder: string;
  prompt: string;
  findGuide: (slug: string | null) => CuratedGuide | undefined;
  match: (q: string) => CuratedGuide[];
  EmptyIcon: Icon;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const guide = findGuide(params.get("city"));
  const curate = params.get("curate") === "1";
  const base = `/${kind}`;

  // Coming back via the sidebar (no ?city=): reopen the guide you were last looking at.
  const lastKey = `travel-bug:guide-city:${kind}`;
  const [restoring, setRestoring] = useState(!params.get("city"));
  useEffect(() => {
    if (params.get("city")) {
      setRestoring(false);
      return;
    }
    let last: string | null = null;
    try {
      last = sessionStorage.getItem(lastKey);
    } catch {
      /* ignore */
    }
    if (last && findGuide(last)) router.replace(`${base}?city=${last}${curate ? "&curate=1" : ""}`, { scroll: false });
    else setRestoring(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);
  useEffect(() => {
    if (!guide) return;
    try {
      sessionStorage.setItem(lastKey, guide.slug);
    } catch {
      /* ignore */
    }
  }, [guide, lastKey]);

  // Curator photo picks for this guide (this browser), layered over picks saved in the guide data.
  const [picks, setPicks] = useState<Record<string, number>>({});
  useEffect(() => setPicks(guide ? readPicks(kind, guide.slug) : {}), [guide, kind]);
  const pickFor = (p: CuratedPlace) => picks[p.id] ?? p.photo;
  const setPick = useCallback(
    (id: string, i: number) => {
      if (!guide) return;
      setPicks((cur) => {
        const next = { ...cur, [id]: i };
        writePicks(kind, guide.slug, next);
        return next;
      });
    },
    [guide, kind],
  );
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-6">
      <PageTitle>{title}</PageTitle>

      <div className="pt-2 space-y-5">
        <CitySearch
          value={guide?.city ?? ""}
          match={match}
          placeholder={searchPlaceholder}
          onPick={(g) => router.replace(`${base}?city=${g.slug}${curate ? "&curate=1" : ""}`, { scroll: false })}
        />
        <hr className="border-line" />
      </div>

      {!guide && !restoring && <p className="text-ink-muted">{prompt}</p>}

      {guide && (
        <div className="space-y-9">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-[26px] font-bold leading-tight">{guide.city}</h2>
              <p className="text-ink-muted mt-1 max-w-2xl">{guide.intro}</p>
            </div>
            {curate && (
              <div className="rounded-xl bg-surface px-4 py-3 text-[13px] max-w-md">
                <p className="font-semibold">Curating photos</p>
                <p className="text-ink-muted">
                  Use the arrows on each image to choose its photo. {Object.keys(picks).length} picked in this browser.
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(JSON.stringify(picks, null, 2)).catch(() => {});
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-white border border-line hover:bg-surface-strong"
                >
                  <Copy className="size-3.5" /> {copied ? "Copied" : "Copy picks"}
                </button>
              </div>
            )}
          </div>
          {guide.sections.map((section) => (
            <section key={section.id} className="space-y-4">
              <SectionTitle>{section.title}</SectionTitle>
              <div className="-mr-5 md:-mr-12 flex gap-5 md:gap-6 overflow-x-auto no-scrollbar pb-2 snap-x">
                {section.places.map((p, i) => (
                  <PlaceCard
                    key={p.id}
                    place={p}
                    index={i}
                    guide={guide}
                    curate={curate}
                    pick={pickFor(p)}
                    onPick={(n) => setPick(p.id, n)}
                    EmptyIcon={EmptyIcon}
                  />
                ))}
                <span className="shrink-0 w-1" aria-hidden />
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
