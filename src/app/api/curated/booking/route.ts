import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { NextResponse } from "next/server";
import { PROVIDERS, providerOf } from "@/lib/booking";

/**
 * Finds a restaurant's online booking page by reading its own website (the one on its Google
 * listing) and looking for a link to a booking system — OpenTable, Resy, SevenRooms, TheFork,
 * Quandoo, Tock… Returns { url, provider } or { url: null }. Results are cached for a day.
 */
const g = globalThis as unknown as { __bookingCache?: Map<string, { at: number; v: Found }> };
const cache = (g.__bookingCache ??= new Map());
type Found = { url: string | null; provider: string | null };
const DAY = 86_400_000;

/** Only ordinary public websites (not this server's network). */
function safeUrl(raw: string): URL | null {
  try {
    const u = new URL(raw);
    if (!/^https?:$/.test(u.protocol)) return null;
    const h = u.hostname.toLowerCase();
    if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || isIP(h)) return null;
    return u;
  } catch {
    return null;
  }
}

/** True for loopback, private, link-local and similar addresses. */
function isPrivateIp(ip: string) {
  return /^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.|::1$|f[cd]|fe80:|::ffff:(127|10|192\.168)\.)/i.test(ip);
}

async function fetchText(u: URL): Promise<string> {
  const addrs = await lookup(u.hostname, { all: true }).catch(() => []);
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) return "";
  const res = await fetch(u, {
    redirect: "follow",
    signal: AbortSignal.timeout(6000),
    headers: { "User-Agent": "Mozilla/5.0 (compatible; wheretonext/1.0; +booking-link-finder)", Accept: "text/html" },
  });
  if (!res.ok || !(res.headers.get("content-type") ?? "").includes("html")) return "";
  const text = await res.text();
  return text.slice(0, 1_500_000);
}

/** Booking-system links on a page: hrefs, iframes and widget URLs, best first. */
function findBookingLinks(html: string, base: URL): string[] {
  const out: string[] = [];
  const re = /(?:href|src|data-[\w-]+)\s*=\s*["']([^"']+)["']|https?:\/\/[^\s"'<>\\)]+/gi;
  for (const m of html.matchAll(re)) {
    const raw = (m[1] ?? m[0]).replace(/&amp;/g, "&");
    try {
      const u = new URL(raw, base);
      if (PROVIDERS.some((p) => p.host.test(u.hostname.toLowerCase()))) out.push(u.toString());
    } catch {
      /* not a URL */
    }
  }
  // Real booking pages (recognised paths) before widget scripts and homepages
  return [...new Set(out)].sort((a, b) => Number(!!providerOf(b)) - Number(!!providerOf(a)));
}

export async function GET(req: Request) {
  const website = new URL(req.url).searchParams.get("website") ?? "";
  const site = safeUrl(website);
  if (!site) return NextResponse.json({ url: null, provider: null });
  const key = site.origin + site.pathname;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < DAY) return NextResponse.json(hit.v);

  let found: Found = { url: null, provider: null };
  try {
    // The website itself, then a likely booking/reservations page linked from it
    const html = await fetchText(site);
    let links = findBookingLinks(html, site);
    if (!links.some((l) => providerOf(l))) {
      const sub = [...html.matchAll(/href\s*=\s*["']([^"']*(?:reserv|book|table|tisch|buchen)[^"']*)["']/gi)]
        .map((m) => { try { return new URL(m[1], site); } catch { return null; } })
        .find((u) => u && u.hostname === site.hostname);
      if (sub) links = [...links, ...findBookingLinks(await fetchText(sub), sub)];
    }
    const best = links.find((l) => providerOf(l)) ?? null;
    if (best) found = { url: best, provider: providerOf(best)!.name };
  } catch {
    /* site unreachable or slow: no booking link */
  }
  cache.set(key, { at: Date.now(), v: found });
  return NextResponse.json(found, { headers: { "Cache-Control": "public, max-age=3600" } });
}
