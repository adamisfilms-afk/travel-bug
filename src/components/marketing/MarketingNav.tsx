import Link from "next/link";
import { BRAND } from "@/lib/brand";

/** Sections link to the app for now; later they'll show a blurred preview that asks you to sign up. */
const LINKS = [
  { href: "/flights", label: "Flights" },
  { href: "/stays", label: "Stays" },
  { href: "/food", label: "Eats" },
  { href: "/explore", label: "Experiences" },
];

export function MarketingNav() {
  return (
    <header className="absolute inset-x-3 sm:inset-x-6 lg:inset-x-[3.4%] top-3 sm:top-6 lg:top-10 z-20">
      <nav className="grid grid-cols-[auto_1fr_auto] items-center gap-4 h-14 lg:h-[66px] rounded-full bg-ph-sky/95 backdrop-blur-sm px-5 sm:px-8 lg:px-11 shadow-sm">
        <Link href="/" className="text-[20px] lg:text-[30px] font-bold tracking-tight">
          {BRAND}
        </Link>
        <ul className="hidden md:flex items-center justify-center gap-10 lg:gap-[clamp(2.5rem,5vw,5.5rem)] text-[16px] lg:text-[20px]">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="hover:underline underline-offset-4 decoration-1">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/login" className="col-start-3 text-[16px] lg:text-[20px] hover:underline underline-offset-4 decoration-1">
          Log in
        </Link>
      </nav>
      {/* Small screens: sections as a row of chips under the bar */}
      <ul className="md:hidden mt-2 flex justify-center gap-2 text-[14px]">
        {LINKS.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="inline-block rounded-full bg-ph-sky/90 px-3 py-1">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </header>
  );
}

/** Full-screen landscape photo with a soft wash so dark text stays readable. */
export function HeroBackground({ blur = false }: { blur?: boolean }) {
  return (
    <div aria-hidden className="absolute inset-0 -z-0 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/landing/hero.jpg"
        alt=""
        className={`absolute inset-0 size-full object-cover object-top ${blur ? "scale-105 blur-md" : ""}`}
        fetchPriority="high"
      />
      <div className="absolute inset-0 bg-white/10" />
      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />
    </div>
  );
}
