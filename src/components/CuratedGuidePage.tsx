"use client";

import { CaretLeft, CaretRight, Copy, ForkKnife, MapPin, MapTrifold, X, type Icon } from "@phosphor-icons/react";
import clsx from "clsx";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { PlaceModal } from "@/components/PlaceModal";
import { AddToTripButton } from "@/components/trips";
import { Map as GuideMap, type MapPoint } from "@/components/Map";
import { useClickOutside } from "@/components/ui";
import { useCuratedPlace, useOverrides } from "@/lib/curated/overrides";
import { cityGuideBySlug, kindOfPlace, matchCityGuides, type CityGuide, type GuideKind } from "@/lib/curated/city-guides";
import type { CuratedGuide, CuratedPlace } from "@/lib/curated/types";
import { useStore } from "@/lib/store";

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
  place: basePlace,
  guide,
  curate,
  pick,
  onPick,
  EmptyIcon,
  onOpen,
  active,
  onHover,
}: {
  place: CuratedPlace;
  guide: CuratedGuide;
  curate: boolean;
  /** Photo index chosen by a curator (data or this browser's picks); undefined = automatic. */
  pick?: number;
  onPick: (i: number) => void;
  EmptyIcon: Icon;
  /** Open the place view. */
  onOpen: () => void;
  /** Its pin is hovered on the map. */
  active?: boolean;
  onHover?: (on: boolean) => void;
}) {
  const place = useCuratedPlace(basePlace);
  const ref = useRef<HTMLDivElement>(null);
  const cached = photoCache.get(photoKey(place.mapsQuery, pick));
  const [visible, setVisible] = useState(!!cached);
  const [photo, setPhoto] = useState<Photo | null>(cached && cached !== "failed" ? cached : null);
  const [failed, setFailed] = useState(cached === "failed");
  const activities = useStore((s) => s.activities);
  const addActivity = useStore((s) => s.addActivity);
  const removeActivity = useStore((s) => s.removeActivity);
  const addedTo = activities.filter((a) => a.name === place.name).map((a) => a.tripId);

  // Load the photo once the card is near the viewport
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setVisible(true), io.disconnect()), { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // An admin-curated cover, or your own/licensed photo, replaces the automatic Google pick (and skips that request)
  const cover = place.photos?.[0];
  const own = cover?.kind === "url" ? { src: cover.src, alt: undefined } : cover ? undefined : place.images?.[0];
  const googleCover = cover?.kind === "google" ? cover.name : null;
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!visible || !googleCover) return;
    let cancelled = false;
    fetch(`/api/curated/media?name=${encodeURIComponent(googleCover)}&w=800`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { url: string }) => !cancelled && setCoverUrl(d.url))
      .catch(() => !cancelled && setCoverUrl(null));
    return () => {
      cancelled = true;
    };
  }, [visible, googleCover]);

  useEffect(() => {
    if (!visible || own || googleCover) return;
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
  }, [visible, place.mapsQuery, pick, own, googleCover]);

  const step = (d: number) => {
    if (!photo) return;
    onPick((photo.index + d + photo.count) % photo.count);
  };

  const img = "absolute inset-0 size-full object-cover film-photo transition-transform duration-500 group-hover:scale-[1.04]";
  const price = place.priceLevel ? "$".repeat(place.priceLevel) : null;

  return (
    <div ref={ref} className="group relative" onMouseEnter={() => onHover?.(true)} onMouseLeave={() => onHover?.(false)}>
      <div
        role="button"
        tabIndex={0}
        aria-label={`Open ${place.name}`}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("button")) return; // curation arrows, add-to-trip
          onOpen();
        }}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && e.target === e.currentTarget && (e.preventDefault(), onOpen())}
        className={clsx(
          "film-grain relative aspect-[5/6] rounded-2xl overflow-hidden cursor-pointer outline-none bg-guide-card transition-shadow",
          "focus-visible:ring-2 focus-visible:ring-guide-active",
          active && "ring-2 ring-guide-active",
        )}
      >
        {own ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={own.src} alt={own.alt ?? place.name} loading="lazy" className={img} />
        ) : googleCover ? (
          coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt={place.name} loading="lazy" className={img} />
          )
        ) : photo && !failed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.url}
            alt={place.name}
            // Photographer credit kept only as a hover tooltip (not shown on screen)
            title={photo.attribution ? `Photo: ${photo.attribution.name} · Google` : undefined}
            loading="lazy"
            onError={() => setFailed(true)}
            className={img}
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-guide-ink/15">
            <EmptyIcon weight="fill" className="size-12" />
          </span>
        )}
        {/* Darken towards the bottom so the title reads */}
        <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-black/5" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 p-4 md:p-5 text-guide-ink">
          <p className="font-serif text-[22px] md:text-[26px] leading-[1.1]">{place.name}</p>
          <p className="mt-1 text-[12px] text-guide-ink/85">
            {place.tagline}
            {price && ` · ${price}`}
          </p>
        </div>
        {curate && !own && !googleCover && photo && photo.count > 1 && (
          <>
            <button type="button" aria-label="Previous photo" onClick={() => step(-1)} className="absolute left-2 top-1/2 -translate-y-1/2 grid place-items-center size-8 rounded-full bg-white/90 shadow">
              <CaretLeft weight="bold" className="size-4" />
            </button>
            <button type="button" aria-label="Next photo" onClick={() => step(1)} className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center size-8 rounded-full bg-white/90 shadow">
              <CaretRight weight="bold" className="size-4" />
            </button>
            <span className="absolute top-2 left-2 rounded-full bg-ink/70 text-white text-[11px] px-2 py-0.5 tabular-nums">
              Photo {photo.index + 1}/{photo.count}
              {pick != null ? " · picked" : " · auto"}
            </span>
          </>
        )}
      </div>
      <div
        className={clsx(
          "absolute top-3 right-3 transition-opacity",
          addedTo.length ? "opacity-100" : "opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100",
        )}
      >
        <AddToTripButton
          compact
          tone="guide"
          addedTo={addedTo}
          defaults={{ destination: guide.city }}
          onAdd={(tripId) => addActivity(tripId, { name: place.name, category: place.category, lat: place.lat, lng: place.lng, place: place.name })}
          onRemove={(tripId) => activities.filter((a) => a.tripId === tripId && a.name === place.name).forEach((a) => removeActivity(a.id))}
        />
      </div>
    </div>
  );
}

// --- Title / city search -----------------------------------------------------------------------

/**
 * The page title doubles as the city search: it shows the open city (or a faded "City Guides"
 * when none is open), and clicking it lets you type a new city.
 */
function TitleSearch({ value, onPick }: { value: string; onPick: (g: CuratedGuide) => void }) {
  const [text, setText] = useState(value);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const reset = () => {
    setOpen(false);
    setText(value);
  };
  useClickOutside(ref, () => open && reset());
  useEffect(() => setText(value), [value]);

  const term = text.trim();
  const matches = open && term && term !== value ? matchCityGuides(term) : [];
  const pick = (g: CuratedGuide) => {
    setText(g.city);
    setOpen(false);
    input.current?.blur();
    onPick(g);
  };

  return (
    <div ref={ref} className="relative flex-1 min-w-0">
      <input
        ref={input}
        aria-label="Search a city"
        value={text}
        placeholder="City Guides"
        spellCheck={false}
        autoComplete="off"
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
          } else if (e.key === "Escape") {
            reset();
            input.current?.blur();
          }
        }}
        className={clsx(
          "w-full bg-transparent outline-none font-serif text-[40px] md:text-[54px] leading-[1.15] text-guide-ink caret-guide-ink",
          "placeholder:text-guide-ink/30 border-b border-transparent hover:border-guide-ink/20 focus:border-guide-ink/40 transition-colors cursor-text",
        )}
      />
      {open && term.length > 0 && term !== value && (
        <div className="absolute left-0 top-full mt-2 z-30 w-full max-w-[420px] rounded-xl bg-guide-card shadow-xl border border-white/10 py-2 text-[14px]">
          {matches.map((g, i) => (
            <button
              key={g.slug}
              type="button"
              onMouseEnter={() => setHi(i)}
              onClick={() => pick(g)}
              className={clsx("w-full text-left px-4 py-2 flex items-center justify-between gap-3", i === hi && "bg-white/10")}
            >
              <span>
                <span className="font-medium">{g.city}</span>
                <span className="text-guide-ink/60"> · {g.country}</span>
              </span>
              <span className="text-[12px] text-guide-ink/60">{g.sections.reduce((n, sec) => n + sec.places.length, 0)} places</span>
            </button>
          ))}
          {matches.length === 0 && (
            <p className="px-4 py-2 text-guide-ink/60">
              Curated recommendations for <span className="text-guide-ink font-medium">“{term}”</span> are coming soon.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// --- Page ---------------------------------------------------------------------------------------

const ICONS: Record<GuideKind, Icon> = { food: ForkKnife, explore: MapPin };
const KINDS: GuideKind[] = ["food", "explore"];
const BASE = "/guides";
/** Hotels live in the explore guide's "stays" section but get their own chip. */
const STAYS = "explore-stays";

/** City guides: search a city, then its curated places to eat and things to do in rows. */
export function CuratedGuidePage() {
  const router = useRouter();
  const params = useSearchParams();
  const guide: CityGuide | undefined = cityGuideBySlug(params.get("city"));
  const curate = params.get("curate") === "1";
  const placeId = params.get("place");
  const openPlace = guide?.sections.flatMap((s) => s.places).find((p) => p.id === placeId);
  const openedHere = useRef(false);
  const cityUrl = (slug: string) => `${BASE}?city=${slug}${curate ? "&curate=1" : ""}`;
  const open = (p: CuratedPlace) => {
    if (!guide) return;
    openedHere.current = true;
    router.push(`${cityUrl(guide.slug)}&place=${p.id}`, { scroll: false });
  };
  // Back button closes it; if the place was opened from a shared link, drop it from the URL instead
  const close = useCallback(() => {
    if (openedHere.current) {
      openedHere.current = false;
      router.back();
    } else if (guide) router.replace(cityUrl(guide.slug), { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guide, router]);

  // Coming back via the sidebar (no ?city=): reopen the guide you were last looking at.
  const lastKey = "travel-bug:guide-city";
  const [restoring, setRestoring] = useState(!params.get("city"));
  useEffect(() => {
    if (params.get("city")) {
      setRestoring(false);
      return;
    }
    let last: string | null = null;
    try {
      last = sessionStorage.getItem(lastKey) ?? sessionStorage.getItem("travel-bug:guide-city:food");
    } catch {
      /* ignore */
    }
    if (last && cityGuideBySlug(last)) router.replace(cityUrl(last), { scroll: false });
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
  }, [guide]);

  // Curator photo picks (this browser), kept per guide kind, layered over picks saved in the guide data.
  const [picks, setPicks] = useState<Record<GuideKind, Record<string, number>>>({ food: {}, explore: {} });
  useEffect(
    () => setPicks(guide ? { food: readPicks("food", guide.slug), explore: readPicks("explore", guide.slug) } : { food: {}, explore: {} }),
    [guide],
  );
  const pickFor = (p: CuratedPlace) => (guide ? picks[kindOfPlace(guide, p)][p.id] : undefined) ?? p.photo;
  const setPick = useCallback(
    (p: CuratedPlace, i: number) => {
      if (!guide) return;
      const kind = kindOfPlace(guide, p);
      setPicks((cur) => {
        const next = { ...cur, [kind]: { ...cur[kind], [p.id]: i } };
        writePicks(kind, guide.slug, next[kind]);
        return next;
      });
    },
    [guide],
  );
  const [copied, setCopied] = useState(false);
  const pickCount = Object.keys(picks.food).length + Object.keys(picks.explore).length;

  // Filter chips: one per food section, plus one for all of Explore. None selected = everything.
  // Places an admin deleted are left out
  const overrides = useOverrides((s) => s.overrides);
  const loadOverrides = useOverrides((s) => s.load);
  useEffect(loadOverrides, [loadOverrides]);
  const [filter, setFilter] = useState<string | null>(null);
  useEffect(() => setFilter(null), [guide?.slug]);
  const chips = guide
    ? [
        ...guide.sections.filter((sec) => sec.id.startsWith("food-")).map((sec) => ({ id: sec.id, label: sec.title })),
        ...(guide.sections.some((sec) => sec.id.startsWith("explore-") && sec.id !== STAYS) ? [{ id: "explore", label: "Explore" }] : []),
        ...(guide.sections.some((sec) => sec.id === STAYS) ? [{ id: STAYS, label: "Stays" }] : []),
      ]
    : [];
  const visible = (guide?.sections ?? [])
    .filter((sec) => !filter || sec.id === filter || (filter === "explore" && sec.id.startsWith("explore-") && sec.id !== STAYS))
    .flatMap((sec) => sec.places)
    .filter((p) => !overrides[p.id]?.hidden);
  const total = (guide?.sections ?? []).flatMap((sec) => sec.places).filter((p) => !overrides[p.id]?.hidden).length;

  // The map can be hidden to give the places the full width (remembered in this browser)
  const [mapOpen, setMapOpenState] = useState(true);
  useEffect(() => {
    try {
      if (localStorage.getItem("travel-bug:guide-map") === "hidden") setMapOpenState(false);
    } catch {
      /* ignore */
    }
  }, []);
  const setMapOpen = (open: boolean) => {
    setMapOpenState(open);
    try {
      localStorage.setItem("travel-bug:guide-map", open ? "shown" : "hidden");
    } catch {
      /* ignore */
    }
  };

  // Card ↔ map pin hover
  const [hovered, setHovered] = useState<string | null>(null);
  const points: MapPoint[] = visible.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng, label: p.name, kind: "guide" }));

  return (
    <div className="text-guide-ink">
      {/* Dark page background (behind the content, under the fixed sidebar) */}
      <div className="fixed inset-0 z-0 bg-guide-bg" aria-hidden />

      <div className={clsx("relative z-[1] space-y-6", guide && mapOpen && "lg:max-w-[calc(58vw-180px)]")}>
        {/* Title (city search) and filter chips stay pinned while the places scroll */}
        <div className="sticky top-0 z-20 bg-guide-bg -mx-5 px-5 md:-mx-12 md:px-12 -mt-8 md:-mt-10 pt-8 md:pt-10 pb-4 space-y-6">
          <div className="flex items-baseline justify-between gap-x-6">
            <TitleSearch value={guide?.city ?? ""} onPick={(g) => router.replace(cityUrl(g.slug), { scroll: false })} />
            {guide && (
              <span className="shrink-0 flex items-center gap-4 text-[13px] text-guide-ink/75">
                {total} curated places
                {!mapOpen && (
                  <button
                    type="button"
                    onClick={() => setMapOpen(true)}
                    className="hidden lg:inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full border border-guide-ink/30 text-guide-ink text-[13px] hover:border-guide-ink/70"
                  >
                    <MapTrifold className="size-4" /> Show map
                  </button>
                )}
              </span>
            )}
          </div>
          {guide && (
            <div className="flex flex-wrap gap-1.5">
              {chips.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={filter === c.id}
                  onClick={() => setFilter((f) => (f === c.id ? null : c.id))}
                  className={clsx(
                    "h-7 px-3 rounded-full text-[13px] text-guide-bg transition-colors",
                    filter === c.id ? "bg-guide-active" : "bg-guide-chip hover:bg-white",
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {!guide && !restoring && <p className="text-guide-ink/70">Type a city in the title to see our curated places to eat, drink and explore.</p>}

        {guide && (
          <>
            {curate && (
              <div className="rounded-xl bg-guide-card px-4 py-3 text-[13px] max-w-md">
                <p className="font-semibold">Curating photos</p>
                <p className="text-guide-ink/70">
                  Use the arrows on each image to choose its photo, and open a place to add social posts. {pickCount} photos picked in this browser.
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    const out: Record<string, unknown> = {};
                    for (const kind of KINDS) {
                      let social: Record<string, string[]> = {};
                      try {
                        social = JSON.parse(localStorage.getItem(`travel-bug:social-picks:${kind}:${guide.slug}`) ?? "{}");
                      } catch {
                        /* ignore */
                      }
                      out[kind] = { photos: picks[kind], social };
                    }
                    await navigator.clipboard.writeText(JSON.stringify(out, null, 2)).catch(() => {});
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-guide-chip text-guide-bg hover:bg-white"
                >
                  <Copy className="size-3.5" /> {copied ? "Copied" : "Copy picks"}
                </button>
              </div>
            )}

            <div className={clsx("grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6 pt-1", !mapOpen && "lg:grid-cols-3")}>
              {visible.map((p) => (
                <PlaceCard
                  key={p.id}
                  place={p}
                  guide={guide}
                  curate={curate}
                  pick={pickFor(p)}
                  onPick={(n) => setPick(p, n)}
                  onOpen={() => open(p)}
                  EmptyIcon={ICONS[kindOfPlace(guide, p)]}
                  active={hovered === p.id}
                  onHover={(on) => setHovered(on ? p.id : null)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Map of the city's places (large screens) */}
      {guide && mapOpen && (
        <div className="hidden lg:block fixed inset-y-0 right-0 w-[42vw] z-[2] border-l border-white/10">
          <button
            type="button"
            onClick={() => setMapOpen(false)}
            aria-label="Hide map"
            className="absolute top-3 right-3 z-[500] inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-guide-bg text-guide-ink text-[13px] shadow hover:bg-[#243024]"
          >
            <X weight="bold" className="size-3.5" /> Hide map
          </button>
          <GuideMap
            points={points}
            greyscale
            highlightedId={hovered}
            onPointHover={setHovered}
            onPointClick={(id) => {
              const p = visible.find((x) => x.id === id);
              if (p) open(p);
            }}
          />
        </div>
      )}

      {openPlace && guide && (
        <PlaceModal
          key={openPlace.id}
          place={openPlace}
          guide={guide}
          kind={kindOfPlace(guide, openPlace)}
          curate={curate}
          photoPick={pickFor(openPlace)}
          EmptyIcon={ICONS[kindOfPlace(guide, openPlace)]}
          onClose={close}
        />
      )}
    </div>
  );
}
