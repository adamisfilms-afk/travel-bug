import "server-only";
import { PRICE_CHECK_MAX_AGE, searchApiEnabled, withMaxAge } from "@/lib/searchapi";
import { sameHotel, skyscannerHotels } from "@/lib/searchapi-hotels";
import type { Hotel } from "@/lib/types";

/**
 * Live hotel prices and booking links for the trip assistant's stay recommendations.
 *
 * One Skyscanner search for the city on the trip's dates (1 SearchApi credit) prices most
 * hotels; recommended hotels it didn't include get their own search by name, up to
 * ASSISTANT_HOTEL_PRICE_LOOKUPS credits per answer in total (default 3; 0 turns prices off).
 * Responses are reused for PRICE_CHECK_TTL_MINUTES (default 6 hours), so asking again is free.
 *
 * Priced hotels link to their Skyscanner offer (through AFFILIATE_LINK_TEMPLATE when it's set).
 * Each lookup's outcome is logged (step "prices" on the admin page), so missing prices can be traced.
 */

export interface StayPrice {
  nightly: number;
  total: number | null;
  currency: string;
  nights: number;
  link: string;
}

export interface PriceContext {
  city: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  currency: string;
}

/** What happened when pricing (logged for the admin page). */
export interface PriceReport {
  status: "ok" | "skipped" | "error";
  note: string;
}

const BUDGET = Math.max(0, Number(process.env.ASSISTANT_HOTEL_PRICE_LOOKUPS ?? 3));
/** Give up on prices after this long, so a slow Skyscanner search never holds up the answer. */
const TIME_LIMIT_MS = Number(process.env.ASSISTANT_PRICE_TIMEOUT_MS ?? 25_000);

/**
 * Where to look a hotel up when Skyscanner didn't return it: Google Hotels for that hotel (it
 * shows prices from every site). A Skyscanner hotel page needs Skyscanner's own hotel id, which
 * only comes with a priced result.
 */
export function hotelSearchLink(name: string, city: string) {
  return `https://www.google.com/travel/search?q=${encodeURIComponent(`${name} ${city}`.trim())}`;
}

function skipReason(ctx: PriceContext): string | null {
  const today = new Date().toISOString().slice(0, 10);
  if (!BUDGET) return "ASSISTANT_HOTEL_PRICE_LOOKUPS is 0";
  if (!searchApiEnabled()) return "SEARCHAPI_API_KEY isn't set";
  if (process.env.HOTEL_PROVIDER === "mock") return "HOTEL_PROVIDER=mock";
  if (!(ctx.checkOut > ctx.checkIn)) return `trip dates ${ctx.checkIn}–${ctx.checkOut} aren't a valid stay`;
  if (ctx.checkIn < today) return `trip dates ${ctx.checkIn}–${ctx.checkOut} are in the past`;
  return null;
}

const toPrice = (h: Hotel, ctx: PriceContext): StayPrice => {
  const nights = Math.max(1, Math.round((Date.parse(ctx.checkOut) - Date.parse(ctx.checkIn)) / 86_400_000));
  return { nightly: Math.round(h.pricePerNight), total: h.totalPrice ? Math.round(h.totalPrice) : null, currency: h.currency, nights, link: h.bookingUrl };
};

/**
 * Prices for these hotels on the trip's dates, by name. `targeted` = how many hotels the city
 * search missed may be looked up by name (each 1 credit unless cached).
 */
export async function priceStays(names: string[], ctx: PriceContext, targeted = 0, timeLimitMs = TIME_LIMIT_MS): Promise<{ prices: Map<string, StayPrice>; report: PriceReport }> {
  const out = new Map<string, StayPrice>();
  if (!names.length) return { prices: out, report: { status: "skipped", note: "no hotels to price" } };
  const skip = skipReason(ctx);
  if (skip) return { prices: out, report: { status: "skipped", note: skip } };

  const notes: string[] = [];
  const work = withMaxAge(PRICE_CHECK_MAX_AGE, async () => {
    const params = { checkIn: ctx.checkIn, checkOut: ctx.checkOut, adults: ctx.adults, currency: ctx.currency };
    const cityHotels = await skyscannerHotels({ q: ctx.city, ...params });
    notes.push(`"${ctx.city}" ${ctx.checkIn}–${ctx.checkOut}: ${cityHotels.length} hotels`);
    for (const n of names) {
      const h = cityHotels.find((x) => sameHotel(x.name, n));
      if (h) out.set(n, toPrice(h, ctx));
    }
    const missing = names.filter((n) => !out.has(n)).slice(0, Math.min(targeted, Math.max(0, BUDGET - 1)));
    await Promise.all(
      missing.map(async (n) => {
        let found: Hotel[] = [];
        try {
          found = await skyscannerHotels({ q: `${n}, ${ctx.city}`, ...params });
        } catch (e) {
          notes.push(`"${n}" search failed: ${e instanceof Error ? e.message : String(e)}`);
        }
        const h = found.find((x) => sameHotel(x.name, n));
        if (h) out.set(n, toPrice(h, ctx));
        else if (found.length) notes.push(`"${n}": no name match (got ${found.slice(0, 2).map((x) => x.name).join(", ")})`);
      }),
    );
  });

  try {
    const timedOut = await Promise.race([work.then(() => false), new Promise<boolean>((r) => setTimeout(() => r(true), timeLimitMs))]);
    const summary = [`priced ${out.size}/${names.length}`, ...notes].join("; ");
    if (timedOut) return { prices: out, report: { status: "error", note: `timed out after ${timeLimitMs / 1000}s; ${summary}` } };
    return { prices: out, report: { status: "ok", note: summary } };
  } catch (e) {
    console.error("[assistant] hotel prices", e);
    return { prices: out, report: { status: "error", note: [e instanceof Error ? e.message : String(e), ...notes].join("; ").slice(0, 480) } };
  }
}
