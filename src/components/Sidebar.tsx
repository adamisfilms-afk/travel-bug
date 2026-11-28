"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GlobeMark, ScribbleIcon, ScribbleRing, type ScribbleIconName } from "@/components/brand/Scribbles";
import { useAccountInfo } from "@/lib/auth";

const TOP: { href: string; label: string; icon: ScribbleIconName }[] = [
  { href: "/flights", label: "Flights", icon: "flights" },
  { href: "/stays", label: "Stays", icon: "stays" },
  { href: "/guides", label: "City Guides", icon: "guides" },
  { href: "/trips", label: "Your trips", icon: "trips" },
];

/**
 * A sidebar link: the icon drawn in pen, with a scribbled ring round it for the page you're on
 * (lime) and a faint one on hover.
 */
function NavItem({ href, label, children, active }: { href: string; label: string; children: React.ReactNode; active: boolean }) {
  return (
    <Link href={href} aria-label={label} title={label} aria-current={active ? "page" : undefined} className="group relative grid place-items-center size-11 md:size-12">
      <ScribbleRing
        className={clsx(
          "pointer-events-none absolute -inset-1 size-[calc(100%+0.5rem)] transition-opacity duration-150",
          active ? "opacity-100 text-guide-active" : "opacity-0 text-current group-hover:opacity-25",
        )}
      />
      <span className="relative">{children}</span>
    </Link>
  );
}

export function Sidebar() {
  const path = usePathname();
  const account = useAccountInfo();
  const on = (href: string) => path === href || path.startsWith(href + "/");
  // City Guides has its own dark theme
  const dark = on("/guides");
  const icon = "block size-[26px] md:size-[28px]";
  return (
    <aside
      className={clsx(
        // Phones: a tab bar along the bottom. Tablets and up: the sidebar on the left.
        "fixed z-40 flex items-center",
        "inset-x-0 bottom-0 h-[calc(60px+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] px-2 justify-around border-t",
        "md:inset-x-auto md:inset-y-0 md:left-0 md:h-auto md:w-[84px] md:flex-col md:justify-start md:px-0 md:pb-8 md:pt-7 md:border-t-0 md:border-r",
        dark ? "bg-guide-bg text-guide-ink border-white/10" : "border-line bg-canvas text-ink",
      )}
    >
      {/* Home: the logo's globe (the gradient orb now belongs to the AI assistant) */}
      <NavItem href="/home" label="Home" active={on("/home")}>
        <GlobeMark className="block w-[34px] md:w-[40px] h-auto" />
      </NavItem>
      <nav className="contents md:flex md:mt-6 md:flex-col md:gap-3">
        {TOP.map((i) => (
          <NavItem key={i.href} href={i.href} label={i.label} active={on(i.href)}>
            <ScribbleIcon name={i.icon} className={icon} />
          </NavItem>
        ))}
      </nav>
      <nav className="contents md:flex md:mt-auto md:flex-col md:gap-3">
        {account.isAdmin && (
          <NavItem href="/admin" label="Admin" active={on("/admin")}>
            <ScribbleIcon name="admin" className={icon} />
          </NavItem>
        )}
        <NavItem href="/settings" label="Settings" active={on("/settings")}>
          <ScribbleIcon name="settings" className={icon} />
        </NavItem>
      </nav>
    </aside>
  );
}
