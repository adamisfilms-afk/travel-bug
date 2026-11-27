import Link from "next/link";
import { HeroBackground, MarketingNav } from "@/components/marketing/MarketingNav";
import { RotatingWord } from "@/components/marketing/RotatingWord";
import { HERO_WORDS } from "@/lib/brand";

export default function LandingPage() {
  return (
    <div className="relative min-h-[100svh] overflow-hidden isolate text-guide-ink">
      <HeroBackground />
      <MarketingNav />

      <main className="relative z-10 min-h-[100svh] flex flex-col items-center justify-center px-5 pt-28 pb-16 text-center">
        <h1 className="font-extrabold tracking-tight leading-[1.04] text-[clamp(2.25rem,4.8vw,5.75rem)] drop-shadow-[0_2px_12px_rgba(0,0,0,0.25)]">
          <span className="sr-only">Every trip, perfectly {HERO_WORDS.join(", ")}.</span>
          <span aria-hidden>Every trip, perfectly</span>
          <br />
          <RotatingWord words={HERO_WORDS} className="text-guide-active" />
        </h1>
        <p className="mt-5 sm:mt-7 max-w-[560px] text-[clamp(1rem,1.2vw,1.3rem)] leading-snug">
          Curated places to eat and explore, plus flights, stays and your itinerary, all in one place.
        </p>
        <Link
          href="/home"
          className="mt-9 sm:mt-16 inline-flex items-center justify-center h-12 lg:h-[54px] px-8 lg:px-11 rounded-full bg-guide-active text-guide-bg text-[16px] lg:text-[18px] shadow-sm hover:bg-[#dcdd8f] transition-colors"
        >
          Join for free
        </Link>
      </main>
    </div>
  );
}
