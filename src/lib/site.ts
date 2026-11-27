/**
 * The site's public address, for links that leave the app (invite emails, invite and share links).
 * Order: NEXT_PUBLIC_SITE_URL (e.g. your own domain) → Vercel's production domain (set automatically
 * on Vercel) → the address the request/page came from (local development).
 * Never a deployment-specific Vercel address: those sit behind Vercel's login.
 */
export function siteUrl(fallbackOrigin?: string): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  const vercel = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const origin = explicit || (vercel ? `https://${vercel}` : "") || fallbackOrigin || (typeof window !== "undefined" ? window.location.origin : "");
  return origin.replace(/\/+$/, "");
}

/** An invite link, carrying the trip name and inviter so the login page can say who invited you. */
export function inviteUrl(token: string, trip?: { name?: string; from?: string | null }, fallbackOrigin?: string) {
  const qs = new URLSearchParams();
  if (trip?.name) qs.set("trip", trip.name);
  if (trip?.from) qs.set("from", trip.from);
  return `${siteUrl(fallbackOrigin)}/invite/${token}${qs.size ? `?${qs}` : ""}`;
}
