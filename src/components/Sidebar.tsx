"use client";

import { AirplaneTilt, ChartBar, GearSix, ListChecks, MapPin, type IconProps } from "@phosphor-icons/react";
import { useAccountInfo } from "@/lib/auth";
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
  { href: "/guides", label: "City Guides", icon: { Icon: MapPin, viewBox: 256, holes: true } },
  { href: "/trips", label: "Your trips", icon: { Icon: ListChecks, viewBox: 256, holes: true } },
];
const BOTTOM = [
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
  const account = useAccountInfo();
  // City Guides has its own dark theme
  const dark = path === "/guides" || path.startsWith("/guides/");
  return (
    <aside
      className={clsx(
        // Phones: a tab bar along the bottom. Tablets and up: the sidebar on the left.
        "fixed z-40 flex items-center",
        "inset-x-0 bottom-0 h-[calc(60px+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] px-2 justify-around border-t",
        "md:inset-x-auto md:inset-y-0 md:left-0 md:h-auto md:w-[84px] md:flex-col md:justify-start md:px-0 md:pb-8 md:pt-8 md:border-t-0 md:border-r",
        dark ? "sidebar-dark bg-guide-bg border-white/10" : "border-line bg-canvas",
      )}
    >
      <Link
        href="/home"
        aria-label="Home"
        title="Home"
        aria-current={path === "/home" ? "page" : undefined}
        className={clsx(
          "shrink-0 size-8 md:size-10 rounded-full shadow-sm ring-offset-2 transition",
          dark ? "ring-offset-guide-bg" : "ring-offset-canvas",
          path === "/home" ? "ring-[1.5px] ring-accent-soft" : "hover:ring-[1.5px] hover:ring-[#bdb8a3]",
        )}
        style={{ background: "radial-gradient(circle at 30% 25%, #f7e98b 0%, #c9e3a3 35%, #9fcde0 70%, #e9d6a5 100%)" }}
      />
      <nav className="contents md:flex md:mt-7 md:flex-col md:gap-4">
        {TOP.map((i) => (
          <NavItem key={i.href} {...i} />
        ))}
      </nav>
      <nav className="contents md:flex md:mt-auto md:flex-col md:gap-4">
        {account.isAdmin && <NavItem href="/admin" label="Admin" icon={{ Icon: ChartBar, viewBox: 256 }} />}
        {BOTTOM.map((i) => (
          <NavItem key={i.href} {...i} />
        ))}
      </nav>
    </aside>
  );
}
