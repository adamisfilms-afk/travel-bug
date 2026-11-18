"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AirplaneTilt, MapPin, ListChecks, GearSix, type IconProps } from "@phosphor-icons/react";
import clsx from "clsx";

/** Solid bed glyph (Phosphor's bed is a side profile; the design uses a front-on bed). */
function BedIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden>
      <path d="M7 6.5A2.5 2.5 0 0 1 9.5 4h13A2.5 2.5 0 0 1 25 6.5V12h-2v-1.5A1.5 1.5 0 0 0 21.5 9h-3A1.5 1.5 0 0 0 17 10.5V12h-2v-1.5A1.5 1.5 0 0 0 13.5 9h-3A1.5 1.5 0 0 0 9 10.5V12H7V6.5Z" />
      <path d="M5.2 14h21.6a2 2 0 0 1 1.9 1.4L30 20v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-3l1.3-4.6A2 2 0 0 1 5.2 14Z" />
      <rect x="3" y="25" width="4" height="3" rx="1" />
      <rect x="25" y="25" width="4" height="3" rx="1" />
    </svg>
  );
}

const TOP = [
  { href: "/flights", label: "Flights", Icon: AirplaneTilt },
  { href: "/stays", label: "Stays", Icon: BedIcon },
  { href: "/explore", label: "Explore", Icon: MapPin },
];
const BOTTOM = [
  { href: "/trips", label: "Your trips", Icon: ListChecks },
  { href: "/settings", label: "Settings", Icon: GearSix },
];

function NavItem({ href, label, Icon }: { href: string; label: string; Icon: React.ComponentType<IconProps> }) {
  const path = usePathname();
  const active = path === href || path.startsWith(href + "/");
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={clsx(
        "grid place-items-center size-12 md:size-14 rounded-xl transition-colors",
        active ? "bg-surface text-ink" : "text-ink hover:bg-surface/70",
      )}
    >
      <Icon weight="fill" className="size-8 md:size-9" />
    </Link>
  );
}

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-[76px] md:w-[108px] border-r border-line bg-canvas flex flex-col items-center py-10">
      <Link
        href="/"
        aria-label="Home"
        title="Home"
        className={clsx(
          "size-11 md:size-12 rounded-full shadow-sm ring-offset-2 ring-offset-canvas transition",
          path === "/" ? "ring-2 ring-accent-soft" : "hover:ring-2 hover:ring-line",
        )}
        style={{ background: "radial-gradient(circle at 30% 25%, #f7e98b 0%, #c9e3a3 35%, #9fcde0 70%, #e9d6a5 100%)" }}
      />
      <nav className="mt-8 flex flex-col gap-6">
        {TOP.map((i) => (
          <NavItem key={i.href} {...i} />
        ))}
      </nav>
      <nav className="mt-auto flex flex-col gap-6">
        {BOTTOM.map((i) => (
          <NavItem key={i.href} {...i} />
        ))}
      </nav>
    </aside>
  );
}
