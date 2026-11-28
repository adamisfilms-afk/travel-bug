import Link from "next/link";
import { Wordmark } from "@/components/brand/Scribbles";
import { BRAND } from "@/lib/brand";

/** Sections link to the app for now; later they'll show a blurred preview that asks you to sign up. */
const LINKS = [
  { href: "/flights", label: "Flights" },
  { href: "/stays", label: "Stays" },
  { href: "/guides", label: "City Guides" },
];

export function MarketingNav() {
  return (
    <header className="absolute inset-x-3 sm:inset-x-6 lg:inset-x-[4%] top-3 sm:top-5 lg:top-7 z-20">
      <nav className="grid grid-cols-[auto_1fr_auto] items-center gap-4 h-12 lg:h-[54px] rounded-full bg-guide-ink/95 text-guide-bg backdrop-blur-sm px-5 sm:px-7 lg:px-9 shadow-sm">
        <Link href="/" aria-label={BRAND} className="text-[25px] lg:text-[30px]">
          <Wordmark />
        </Link>
        <ul className="hidden md:flex items-center justify-center gap-3 lg:gap-[clamp(0.75rem,2.2vw,2.5rem)] text-[14px] lg:text-[16px]">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="inline-flex items-center h-8 lg:h-9 px-3.5 lg:px-4 rounded-full transition-colors hover:bg-white/70">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/login" className="col-start-3 inline-flex items-center h-8 lg:h-9 px-3.5 lg:px-4 -mr-3.5 lg:-mr-4 rounded-full text-[14px] lg:text-[16px] transition-colors hover:bg-white/70">
          Log in
        </Link>
      </nav>
      {/* Small screens: sections as a row of chips under the bar */}
      <ul className="md:hidden mt-2 flex justify-center gap-1.5 text-[13px]">
        {LINKS.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="inline-block rounded-full bg-guide-ink/90 text-guide-bg px-3 py-1">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </header>
  );
}

/** Full-screen film photo with a gentle dark wash so the cream text stays readable. */
export function HeroBackground({ blur = false }: { blur?: boolean }) {
  return (
    <div aria-hidden className="absolute inset-0 -z-0 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/landing/hero.jpg"
        alt=""
        className={`absolute inset-0 size-full object-cover object-center ${blur ? "scale-105 blur-md" : ""}`}
        fetchPriority="high"
      />
      <div className="absolute inset-0 bg-black/20" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.25),transparent_70%)]" />
    </div>
  );
}
