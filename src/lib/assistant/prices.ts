import "server-only";
import {
  PRICE_CHECK_MAX_AGE,
  searchApiEnabled,
  withMaxAge,
} from "@/lib/searchapi";
import { skyscannerHotels } from "@/lib/searchapi-hotels";
import { affiliate } from "@/lib/searchapi-skyscanner";
import type { Hotel } from "@/lib/types";

/**
 * Live hotel prices and booking links for the trip assistant's stay recommendations.
 *
 * One Skyscanner search for the city on the trip's dates (1 SearchApi credit) prices most
 * hotels; recommended hotels it didn't include get their own search by name, up to
 * ASSISTANT_HOTEL_PRICE_LOOKUPS credits per answer in total (default 3; 0 turns prices off).
 * Responses are reused for PRICE_CHECK_TTL_MINUTES (default 6 hours), so asking again is free.
 *
 * Links go through AFFILIATE_LINK_TEMPLATE (Skyscanner affiliate) when it's set.
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

const BUDGET = Math.max(
  0,
  Number(process.env.ASSISTANT_HOTEL_PRICE_LOOKUPS ?? 3),
);

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b(hotel|hotels|the|by|and|boutique|apartments?|suites?)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function sameHotel(a: string, b: string) {
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return false;
  return (
    x === y ||
    (Math.min(x.length, y.length) >= 5 && (x.includes(y) || y.includes(x)))
  );
}

/** A Skyscanner hotel search for this hotel (affiliate-wrapped) — the link when there's no live price. */
export function hotelSearchLink(name: string, city: string) {
  return affiliate(
    `https://www.skyscanner.net/hotels/search?q=${encodeURIComponent(`${name} ${city}`.trim())}`,
  );
}

/** Whether live prices can be looked up for these dates. */
export function canPrice(ctx: PriceContext) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    BUDGET > 0 &&
    searchApiEnabled() &&
    process.env.HOTEL_PROVIDER !== "mock" &&
    ctx.checkIn >= today &&
    ctx.checkOut > ctx.checkIn
  );
}

const toPrice = (h: Hotel, ctx: PriceContext): StayPrice => {
  const nights = Math.max(
    1,
    Math.round(
      (Date.parse(ctx.checkOut) - Date.parse(ctx.checkIn)) / 86_400_000,
    ),
  );
  return {
    nightly: Math.round(h.pricePerNight),
    total: h.totalPrice ? Math.round(h.totalPrice) : null,
    currency: h.currency,
    nights,
    link: h.bookingUrl,
  };
};

/**
 * Prices for these hotels on the trip's dates, by name. `targeted` = how many hotels the city
 * search missed may be looked up by name (each 1 credit unless cached).
 */
export async function priceStays(
  names: string[],
  ctx: PriceContext,
  targeted = 0,
): Promise<Map<string, StayPrice>> {
  const out = new Map<string, StayPrice>();
  if (!names.length || !canPrice(ctx)) return out;
  try {
    await withMaxAge(PRICE_CHECK_MAX_AGE, async () => {
      const params = {
        checkIn: ctx.checkIn,
        checkOut: ctx.checkOut,
        adults: ctx.adults,
        currency: ctx.currency,
      };
      const cityHotels = await skyscannerHotels({ q: ctx.city, ...params });
      for (const n of names) {
        const h = cityHotels.find((x) => sameHotel(x.name, n));
        if (h) out.set(n, toPrice(h, ctx));
      }
      const missing = names
        .filter((n) => !out.has(n))
        .slice(0, Math.min(targeted, Math.max(0, BUDGET - 1)));
      await Promise.all(
        missing.map(async (n) => {
          const found = await skyscannerHotels({
            q: `${n}, ${ctx.city}`,
            ...params,
          }).catch(() => [] as Hotel[]);
          const h = found.find((x) => sameHotel(x.name, n));
          if (h) out.set(n, toPrice(h, ctx));
        }),
      );
    });
  } catch (e) {
    console.error("[assistant] hotel prices", e);
  }
  return out;
}
