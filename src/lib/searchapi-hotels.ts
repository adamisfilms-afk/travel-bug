import "server-only";
import { searchApiCall, type Json } from "./searchapi";
import { affiliate } from "./searchapi-skyscanner";
import type { BookingOption, Hotel } from "./types";

/**
 * Hotels from Skyscanner via SearchApi.io (engine=skyscanner_hotels): each property with
 * nightly/total price, stars, guest rating, location, coordinates, and every partner's
 * rate and booking link.
 *
 * Only part of the response schema is documented, so parsing accepts several field
 * names. In development, if key fields can't be found, a sample response is saved to
 * .debug/skyscanner-hotels-sample.json (git-ignored) so the real names can be checked.
 */

export interface HotelSearchParams {
  q: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  currency: string;
}

const COLORS = ["#C9B8A4", "#B9C4CC", "#C7CBB5", "#D3C2B0", "#B7C7BD", "#CDBFCB"];

const str = (...vals: unknown[]) => vals.find((v) => typeof v === "string" && v.trim()) as string | undefined;

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^\d.-]/g, ""));
    return v.trim() && Number.isFinite(n) ? n : null;
  }
  if (v && typeof v === "object") {
    const o = v as Json;
    return num(o.extracted_lowest ?? o.lowest ?? o.amount ?? o.value ?? o.raw ?? o.price ?? o.per_night ?? o.extracted);
  }
  return null;
}

function priceOf(o: Json, keys: string[]): number | null {
  for (const k of keys) {
    const n = num(o?.[k]);
    if (n != null) return n;
  }
  return null;
}

const NIGHTLY = ["price_per_night", "rate_per_night", "nightly_price", "per_night", "price", "cheapest_price", "lowest_price"];
const TOTAL = ["total_price", "total_rate", "price_total", "total"];

function coordsOf(h: Json): { lat: number; lng: number } | null {
  for (const c of [h?.gps_coordinates, h?.coordinates, h?.location?.coordinates, h?.geo, h?.location, h]) {
    if (!c || typeof c !== "object") continue;
    const lat = num(c.latitude ?? c.lat);
    const lng = num(c.longitude ?? c.lng ?? c.lon);
    if (lat != null && lng != null && (lat !== 0 || lng !== 0)) return { lat, lng };
  }
  return null;
}

function imagesOf(h: Json): string[] {
  const out: string[] = [];
  const add = (v: unknown) => {
    if (typeof v === "string" && /^https?:/.test(v)) out.push(v);
    else if (v && typeof v === "object") add(str((v as Json).original_image, (v as Json).url, (v as Json).thumbnail, (v as Json).src, (v as Json).link));
  };
  for (const key of ["images", "photos", "gallery"]) if (Array.isArray(h?.[key])) h[key].forEach(add);
  add(h?.thumbnail);
  add(h?.image);
  add(h?.main_image);
  return [...new Set(out)];
}

function offersOf(h: Json): BookingOption[] {
  const lists: Json[][] = [h?.booking_options, h?.offers, h?.partners, h?.prices, h?.rates, h?.deals].filter(Array.isArray);
  const out: BookingOption[] = [];
  for (const list of lists) {
    for (const o of list) {
      const url = str(o?.link, o?.url, o?.booking_link, o?.tracking_link, o?.deep_link, o?.deeplink);
      if (!url) continue;
      const name =
        str(o?.book_with, o?.partner, o?.partner_name, o?.provider, o?.source, o?.name, o?.seller, o?.agent) ??
        str(o?.partner?.name, o?.provider?.name, o?.seller?.name) ??
        "Partner";
      out.push({ name, price: priceOf(o, NIGHTLY), url: affiliate(url), room: str(o?.room, o?.room_type, o?.room_name) });
    }
  }
  return out.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
}

function starsOf(h: Json): number {
  const v = h?.stars ?? h?.star_rating ?? h?.hotel_class ?? h?.extracted_hotel_class ?? h?.class;
  const n = typeof v === "number" ? v : Number(String(v ?? "").match(/\d/)?.[0] ?? 0);
  return Math.max(0, Math.min(5, Math.round(n)));
}

function ratingOf(h: Json): { rating: number; reviews: number } {
  const r = h?.rating ?? h?.guest_rating ?? h?.overall_rating ?? h?.review_score ?? h?.reviews_summary?.score;
  let rating = typeof r === "number" ? r : num(r) ?? 0;
  if (rating > 5) rating = rating / 2; // 10-point scales → out of 5
  const reviews = num(h?.reviews ?? h?.reviews_count ?? h?.review_count ?? h?.number_of_reviews ?? h?.reviews_summary?.count) ?? 0;
  return { rating: Math.round(rating * 10) / 10, reviews: Math.round(reviews) };
}

let lastDump = 0;
function dumpForDebugging(data: Json, reason: string) {
  if (process.env.NODE_ENV === "production" || Date.now() - lastDump < 60_000) return;
  lastDump = Date.now();
  void (async () => {
    try {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      const dir = path.join(process.cwd(), ".debug");
      await fs.mkdir(dir, { recursive: true });
      const list = data?.hotels ?? data?.properties ?? data?.results ?? [];
      const sample = { reason, top_level_keys: Object.keys(data ?? {}), first_hotel: list[0] ?? null };
      await fs.writeFile(path.join(dir, "skyscanner-hotels-sample.json"), JSON.stringify(sample, null, 2));
      console.warn(`[searchapi:skyscanner_hotels] ${reason} — saved a sample to .debug/skyscanner-hotels-sample.json`);
    } catch {
      /* ignore */
    }
  })();
}

export async function skyscannerHotels(p: HotelSearchParams): Promise<Hotel[]> {
  const data = await searchApiCall("skyscanner_hotels", {
    q: p.q,
    check_in_date: p.checkIn,
    check_out_date: p.checkOut,
    adults: p.adults,
    currency: p.currency,
  });
  const list: Json[] = data?.hotels ?? data?.properties ?? data?.results ?? data?.items ?? [];
  const hotels: Hotel[] = [];
  let missingCoords = 0;
  let missingPartners = 0;
  list.forEach((h, i) => {
    const name = str(h?.name, h?.title, h?.hotel_name);
    const offers = offersOf(h);
    const nightly = priceOf(h, NIGHTLY) ?? offers[0]?.price ?? null;
    const coords = coordsOf(h);
    if (!name || nightly == null) return;
    if (!coords) missingCoords++;
    if (!offers.length) missingPartners++;
    const { rating, reviews } = ratingOf(h);
    const link = str(h?.link, h?.tracking_link, h?.url, h?.booking_link);
    const area = str(h?.district, h?.neighborhood, h?.neighbourhood, h?.area, h?.address, h?.location?.address, typeof h?.location === "string" ? h.location : undefined) ?? p.q;
    hotels.push({
      id: `ss-hotel-${str(h?.id, h?.hotel_id, h?.property_token, h?.entity_id) ?? `${i}-${name}`}`,
      name,
      stars: starsOf(h),
      area,
      city: str(h?.city, h?.location?.city) ?? p.q,
      lat: coords?.lat ?? 0,
      lng: coords?.lng ?? 0,
      rating,
      reviews,
      tags: (Array.isArray(h?.highlights) ? h.highlights : Array.isArray(h?.tags) ? h.tags : []).filter((t: unknown) => typeof t === "string").slice(0, 5),
      amenities: (Array.isArray(h?.amenities) ? h.amenities : []).map((a: Json) => (typeof a === "string" ? a : str(a?.name, a?.title))).filter(Boolean),
      pricePerNight: nightly,
      totalPrice: priceOf(h, TOTAL) ?? undefined,
      currency: p.currency,
      provider: offers[0]?.name ?? "Skyscanner",
      roomType: offers[0]?.room ?? str(h?.room_type) ?? "",
      bookingUrl: offers[0]?.url ?? affiliate(link ?? `https://www.skyscanner.net/hotels/search?q=${encodeURIComponent(name)}`),
      bookingOptions: offers.length ? offers : undefined,
      imageColor: COLORS[i % COLORS.length],
      images: imagesOf(h),
    });
  });
  if (!hotels.length && list.length) {
    dumpForDebugging(data, "Hotels in an unexpected format");
    throw new Error("SearchApi returned hotels in an unexpected format (see .debug/skyscanner-hotels-sample.json).");
  }
  if (missingCoords || missingPartners) {
    dumpForDebugging(data, `${missingCoords} hotels without coordinates, ${missingPartners} without partner offers`);
  }
  return hotels;
}
