"use client";

import { AirplaneTilt, ForkKnife, GearSix, ListChecks, MapPin, type IconProps } from "@phosphor-icons/react";
import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, type ComponentType } from "react";

const ICON_PX = 28;

/** Solid front-on bed glyph (viewBox 32). */
function BedIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={ICON_PX} height={ICON_PX} className={className} style={style} fill="currentColor" aria-hidden>
      <path d="M7 6.5A2.5 2.5 0 0 1 9.5 4h13A2.5 2.5 0 0 1 25 6.5V12h-2v-1.5A1.5 1.5 0 0 0 21.5 9h-3A1.5 1.5 0 0 0 17 10.5V12h-2v-1.5A1.5 1.5 0 0 0 13.5 9h-3A1.5 1.5 0 0 0 9 10.5V12H7V6.5Z" />
      <path d="M5.2 14h21.6a2 2 0 0 1 1.9 1.4L30 20v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-3l1.3-4.6A2 2 0 0 1 5.2 14Z" />
      <rect x="3" y="25" width="4" height="3" rx="1" />
      <rect x="25" y="25" width="4" height="3" rx="1" />
    </svg>
  );
}

/** `holes`: the icon has cut-outs (pin centre, gear centre) — outline only its first outer shape. */
type NavIconDef = { Icon: ComponentType<IconProps>; viewBox: number; holes?: boolean };

/**
 * Renders the icon three times: an outline layer, a background "gap" layer, then the icon.
 * The two under-layers keep only each path's outer contour so holes (pin centre, gear
 * centre, checklist cut-outs) don't get outlined.
 */
function NavIcon({ Icon, viewBox, holes }: NavIconDef) {
  const under = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    if (!holes) return; // icons made of several separate shapes (fork + knife) keep them all
    under.current?.querySelectorAll("path").forEach((p) => {
      const d = p.getAttribute("d") ?? "";
      const outer = d.split(/(?=[Mm])/)[0];
      if (outer !== d) p.setAttribute("d", outer);
    });
  });
  const props = { weight: "fill" as const, size: ICON_PX };
  return (
    <span className="nav-icon" style={{ ["--u" as string]: viewBox / ICON_PX }}>
      <span ref={under} className="contents">
        <Icon {...props} className="nv-ring" />
        <Icon {...props} className="nv-gap" />
      </span>
      <Icon {...props} />
    </span>
  );
}

const TOP = [
  { href: "/flights", label: "Flights", icon: { Icon: AirplaneTilt, viewBox: 256 } },
  { href: "/stays", label: "Stays", icon: { Icon: BedIcon, viewBox: 32 } },
  { href: "/food", label: "Food", icon: { Icon: ForkKnife, viewBox: 256 } },
  { href: "/explore", label: "Explore", icon: { Icon: MapPin, viewBox: 256, holes: true } },
];
const BOTTOM = [
  { href: "/trips", label: "Your trips", icon: { Icon: ListChecks, viewBox: 256, holes: true } },
  { href: "/settings", label: "Settings", icon: { Icon: GearSix, viewBox: 256, holes: true } },
];

function NavItem({ href, label, icon }: (typeof TOP)[number]) {
  const path = usePathname();
  const active = path === href || path.startsWith(href + "/");
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      aria-current={active ? "page" : undefined}
      className="nav-link grid place-items-center size-11 text-ink"
    >
      <NavIcon {...icon} />
    </Link>
  );
}

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-[64px] md:w-[84px] border-r border-line bg-canvas flex flex-col items-center py-8">
      <Link
        href="/home"
        aria-label="Home"
        title="Home"
        aria-current={path === "/home" ? "page" : undefined}
        className={clsx(
          "size-9 md:size-10 rounded-full shadow-sm ring-offset-2 ring-offset-canvas transition",
          path === "/home" ? "ring-[1.5px] ring-accent-soft" : "hover:ring-[1.5px] hover:ring-[#c3c6bf]",
        )}
        style={{ background: "radial-gradient(circle at 30% 25%, #f7e98b 0%, #c9e3a3 35%, #9fcde0 70%, #e9d6a5 100%)" }}
      />
      <nav className="mt-7 flex flex-col gap-4">
        {TOP.map((i) => (
          <NavItem key={i.href} {...i} />
        ))}
      </nav>
      <nav className="mt-auto flex flex-col gap-4">
        {BOTTOM.map((i) => (
          <NavItem key={i.href} {...i} />
        ))}
      </nav>
    </aside>
  );
}
