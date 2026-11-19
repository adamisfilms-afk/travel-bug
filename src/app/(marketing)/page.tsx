import Link from "next/link";
import { HeroBackground, MarketingNav } from "@/components/marketing/MarketingNav";
import { RotatingWord } from "@/components/marketing/RotatingWord";
import { HERO_WORDS } from "@/lib/brand";

export default function LandingPage() {
  return (
    <div className="relative min-h-[100svh] overflow-hidden isolate text-ink">
      <HeroBackground />
      <MarketingNav />

      <main className="relative z-10 min-h-[100svh] flex flex-col items-center justify-center px-5 pt-28 pb-16 text-center">
        <h1 className="font-extrabold tracking-tight leading-[1.04] text-[clamp(2.75rem,6.2vw,7.4rem)]">
          <span className="sr-only">Every trip, perfectly {HERO_WORDS.join(", ")}.</span>
          <span aria-hidden>Every trip, perfectly</span>
          <br />
          <RotatingWord words={HERO_WORDS} className="text-accent" />
        </h1>
        <p className="mt-6 sm:mt-10 max-w-[820px] text-[clamp(1.05rem,1.45vw,1.65rem)] leading-snug">
          Curated places to eat and explore, plus flights, stays and your itinerary, all in one place.
        </p>
        <Link
          href="/home"
          className="mt-10 sm:mt-[6.5rem] inline-flex items-center justify-center h-14 lg:h-[72px] px-10 lg:px-14 rounded-full bg-ph-sky text-[18px] lg:text-[24px] shadow-sm hover:bg-[#b4d6e2] transition-colors"
        >
          Join for free
        </Link>
      </main>
    </div>
  );
}
