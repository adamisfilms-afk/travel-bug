"use client";

import { ForkKnife, MagnifyingGlass } from "@phosphor-icons/react";
import clsx from "clsx";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { PageTitle, SectionTitle, useClickOutside } from "@/components/ui";
import { FOOD_GUIDES, guideBySlug, matchGuides, type FoodGuide, type FoodPlace } from "@/lib/food/guides";

const PLACEHOLDERS = ["bg-ph-mustard", "bg-ph-sky", "bg-ph-sage", "bg-ph-lime"];

/** Main photo from the place's Google Maps listing, loaded when the card scrolls into view. */
function PlacePhoto({ place, index }: { place: FoodPlace; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [photo, setPhoto] = useState<{ url: string; attribution: { name: string; uri?: string } | null } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        fetch(`/api/food/photo?q=${encodeURIComponent(place.mapsQuery)}&w=800`)
          .then((r) => (r.ok ? r.json() : Promise.reject()))
          .then((d) => !cancelled && setPhoto(d))
          .catch(() => !cancelled && setFailed(true));
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
    };
  }, [place.mapsQuery]);

  return (
    <div ref={ref} className={clsx("relative h-[170px] md:h-[190px] rounded-2xl overflow-hidden", PLACEHOLDERS[index % PLACEHOLDERS.length])}>
      {photo && !failed && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url} alt={place.name} loading="lazy" onError={() => setFailed(true)} className="absolute inset-0 size-full object-cover" />
          {photo.attribution && (
            <a
              href={photo.attribution.uri}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-1.5 right-2 max-w-[80%] truncate rounded bg-black/45 px-1.5 py-0.5 text-[10px] text-white/90"
            >
              Photo: {photo.attribution.name} · Google
            </a>
          )}
        </>
      )}
      {(!photo || failed) && (
        <span className="absolute inset-0 grid place-items-center text-ink/25">
          <ForkKnife weight="fill" className="size-10" />
        </span>
      )}
    </div>
  );
}

function FoodCard({ place, index }: { place: FoodPlace; index: number }) {
  return (
    <a
      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.mapsQuery)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group shrink-0 w-[230px] md:w-[270px] snap-start"
    >
      <PlacePhoto place={place} index={index} />
      <div className="mt-2.5 px-0.5">
        <p className="text-[15px] font-semibold leading-tight truncate group-hover:underline underline-offset-2">{place.name}</p>
        <p className="text-[13px] text-ink-muted truncate">
          {place.tagline} · {place.neighbourhood}
        </p>
      </div>
    </a>
  );
}

function CitySearch({ value, onPick }: { value: string; onPick: (g: FoodGuide) => void }) {
  const [text, setText] = useState(value);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));
  useEffect(() => setText(value), [value]);

  const term = text.trim();
  const matches = matchGuides(term);
  const pick = (g: FoodGuide) => {
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
          placeholder="Search a city for food guides"
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

function FoodInner() {
  const router = useRouter();
  const params = useSearchParams();
  const guide = guideBySlug(params.get("city"));

  return (
    <div className="space-y-6">
      <PageTitle>Food</PageTitle>

      <div className="pt-2 space-y-5">
        <CitySearch value={guide?.city ?? ""} onPick={(g) => router.replace(`/food?city=${g.slug}`, { scroll: false })} />
        <hr className="border-line" />
      </div>

      {!guide && (
        <div className="space-y-3">
          <p className="text-ink-muted">Pick a city to see our curated places to eat and drink.</p>
          <div className="flex flex-wrap gap-2">
            {FOOD_GUIDES.map((g) => (
              <button
                key={g.slug}
                type="button"
                onClick={() => router.replace(`/food?city=${g.slug}`, { scroll: false })}
                className="h-9 px-4 rounded-full bg-surface hover:bg-white text-[14px]"
              >
                {g.city}
              </button>
            ))}
          </div>
        </div>
      )}

      {guide && (
        <div className="space-y-9">
          <div>
            <h2 className="text-[26px] font-bold leading-tight">{guide.city}</h2>
            <p className="text-ink-muted mt-1 max-w-2xl">{guide.intro}</p>
          </div>
          {guide.sections.map((section) => (
            <section key={section.id} className="space-y-4">
              <SectionTitle>{section.title}</SectionTitle>
              <div className="-mr-5 md:-mr-12 flex gap-5 md:gap-6 overflow-x-auto no-scrollbar pb-2 snap-x">
                {section.places.map((p, i) => (
                  <FoodCard key={p.id} place={p} index={i} />
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

export default function FoodPage() {
  return (
    <Suspense>
      <FoodInner />
    </Suspense>
  );
}
