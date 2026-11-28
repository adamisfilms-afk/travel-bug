/**
 * Restaurant booking systems: recognise a booking link and pre-fill it with a date, time and
 * party size where the system supports it (OpenTable, Resy, SevenRooms, Tock). Others open as-is.
 */

export interface BookingProvider {
  id: string;
  name: string;
  /** Hostname match. */
  host: RegExp;
  /** URL paths that are actual booking pages (not the provider's homepage or a widget script). */
  path?: RegExp;
  /** Add date (YYYY-MM-DD), time (HH:mm) and party size to the link, if the system supports it. */
  prefill?: (url: URL, b: BookingRequest) => void;
}

export interface BookingRequest {
  date?: string;
  time?: string;
  party?: number;
}

export const PROVIDERS: BookingProvider[] = [
  {
    id: "opentable",
    name: "OpenTable",
    host: /(^|\.)opentable\.(com|co\.uk|de|at|ie|ca|com\.au|jp|es|it|nl|fr|com\.mx)$/,
    path: /^\/(r\/|restref\/|restaurant\/profile\/|booking\/|[\w-]+-reservations)/,
    prefill: (u, b) => {
      if (b.party) u.searchParams.set("covers", String(b.party));
      if (b.date) u.searchParams.set("dateTime", `${b.date}T${b.time ?? "19:00"}`);
    },
  },
  {
    id: "resy",
    name: "Resy",
    host: /(^|\.)resy\.com$/,
    path: /^\/cities\/[\w-]+\/(venues\/)?[\w-]+/,
    prefill: (u, b) => {
      if (b.date) u.searchParams.set("date", b.date);
      if (b.party) u.searchParams.set("seats", String(b.party));
    },
  },
  {
    id: "sevenrooms",
    name: "SevenRooms",
    host: /(^|\.)sevenrooms\.com$/,
    path: /^\/(reservations|explore)\/[\w-]+/,
    prefill: (u, b) => {
      if (b.date) u.searchParams.set("date", b.date);
      if (b.party) u.searchParams.set("party_size", String(b.party));
    },
  },
  {
    id: "tock",
    name: "Tock",
    host: /(^|\.)exploretock\.com$/,
    path: /^\/[\w-]+/,
    prefill: (u, b) => {
      const venue = u.pathname.split("/").filter(Boolean)[0];
      if (venue && !u.pathname.includes("/search")) u.pathname = `/${venue}/search`;
      if (b.date) u.searchParams.set("date", b.date);
      if (b.party) u.searchParams.set("size", String(b.party));
      if (b.time) u.searchParams.set("time", b.time);
    },
  },
  { id: "thefork", name: "TheFork", host: /(^|\.)(thefork\.[a-z.]+|lafourchette\.com|eltenedor\.[a-z.]+|iens\.nl)$/, path: /^\/(restaurant|restaurante|ristorante|restaurants?)\// },
  { id: "quandoo", name: "Quandoo", host: /(^|\.)quandoo\.[a-z.]+$/, path: /^\/(en\/)?(place|restaurant)\// },
  { id: "dish", name: "DISH Reservation", host: /(^|\.)(dish\.co|reservation\.dish\.co)$/ },
  { id: "resmio", name: "resmio", host: /(^|\.)resmio\.(com|de)$/ },
  { id: "bookatable", name: "Bookatable", host: /(^|\.)bookatable\.[a-z.]+$/ },
  { id: "designmynight", name: "DesignMyNight", host: /(^|\.)designmynight\.com$/ },
  { id: "tablein", name: "Tablein", host: /(^|\.)tablein\.com$/ },
  { id: "formitable", name: "Formitable", host: /(^|\.)formitable\.com$/ },
  { id: "zenchef", name: "Zenchef", host: /(^|\.)(zenchef\.com|bookings\.zenchef\.com)$/ },
  { id: "tableagent", name: "TableAgent", host: /(^|\.)tableagent\.com$/ },
  { id: "yelp", name: "Yelp", host: /(^|\.)yelp\.[a-z.]+$/, path: /^\/reservations\// },
];

export function providerOf(url: string | null | undefined): BookingProvider | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    return PROVIDERS.find((p) => p.host.test(host) && (!p.path || p.path.test(u.pathname))) ?? null;
  } catch {
    return null;
  }
}

/** The booking link with date, time and party size filled in where the system allows it. */
export function bookingLink(url: string, b: BookingRequest): string {
  const p = providerOf(url);
  if (!p?.prefill) return url;
  try {
    const u = new URL(url);
    p.prefill(u, b);
    return u.toString();
  } catch {
    return url;
  }
}

/** Whether the system's page opens on the chosen date/party (so the button can say so). */
export const canPrefill = (url: string | null | undefined) => Boolean(providerOf(url)?.prefill);
