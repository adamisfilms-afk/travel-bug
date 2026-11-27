/**
 * Email designs (shared by the app's invite emails and the Supabase auth email templates
 * built by scripts/build-email-templates.mjs). Email clients need old-school HTML: tables,
 * inline styles, web-safe fallbacks for the fonts. Keep this file free of imports and
 * TypeScript-only syntax beyond plain type annotations, so Node can run it directly.
 */

const BG = "#e7e3d2"; // cream page
const INK = "#151f15"; // deep green-black
const ACCENT = "#d1d27b"; // yellow-green
const SERIF = "'Playfair Display', Georgia, 'Times New Roman', serif";
const SANS = "Inter, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
const BRAND = "wheretonext"; // keep in step with src/lib/brand.ts

export interface EmailParts {
  /** Hidden preview line shown in the inbox list. */
  preheader: string;
  /** Small line above the title, e.g. "Adam invited you to plan". */
  eyebrow: string;
  title: string;
  /** Line under the title, e.g. dates and places. */
  meta?: string;
  /** A short paragraph. */
  body?: string;
  cta: { label: string; url: string };
  /** Small print under the button. */
  note?: string;
  footer: string;
  /** Absolute site address, for the header photo and links (no trailing slash). */
  siteUrl: string;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);

/** Escapes text, but leaves Supabase template tags like {{ .ConfirmationURL }} intact. */
const text = (s: string) => s.split(/(\{\{[^}]*\}\})/).map((part, i) => (i % 2 ? part : esc(part))).join("");

export function emailHtml(p: EmailParts): string {
  const url = text(p.cta.url);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${text(p.title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=Inter:wght@400;500&display=swap" rel="stylesheet">
<style>
  @media (max-width: 600px) {
    .wrap { width: 100% !important; }
    .pad { padding-left: 22px !important; padding-right: 22px !important; }
    .title { font-size: 30px !important; }
  }
  a { color: ${INK}; }
</style>
</head>
<body style="margin:0;padding:0;background:${BG};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${BG};">${text(p.preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG};">
  <tr>
    <td align="center" style="padding:32px 12px 40px;">
      <table role="presentation" class="wrap" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;max-width:560px;">
        <tr>
          <td style="padding:0 6px 18px;font-family:${SERIF};font-size:24px;font-weight:600;letter-spacing:-0.3px;color:${INK};">
            <a href="${text(p.siteUrl)}" style="color:${INK};text-decoration:none;">${BRAND}</a>
          </td>
        </tr>
        <tr>
          <td style="border-radius:20px;overflow:hidden;background:${INK};">
            <img src="${text(p.siteUrl)}/email/hero.jpg" width="560" alt="" style="display:block;width:100%;max-width:560px;height:auto;border:0;border-radius:20px 20px 0 0;filter:brightness(0.85);">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td class="pad" style="padding:30px 36px 36px;">
                  <p style="margin:0 0 10px;font-family:${SANS};font-size:14px;color:${BG};opacity:0.75;">${text(p.eyebrow)}</p>
                  <h1 class="title" style="margin:0;font-family:${SERIF};font-size:36px;line-height:1.1;font-weight:400;color:${BG};">${text(p.title)}</h1>
                  ${p.meta ? `<p style="margin:12px 0 0;font-family:${SANS};font-size:14px;color:${BG};opacity:0.85;">${text(p.meta)}</p>` : ""}
                  ${p.body ? `<p style="margin:20px 0 0;font-family:${SANS};font-size:15px;line-height:1.55;color:${BG};opacity:0.9;">${text(p.body)}</p>` : ""}
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;">
                    <tr>
                      <td style="border-radius:999px;background:${ACCENT};">
                        <a href="${url}" style="display:inline-block;padding:14px 30px;font-family:${SANS};font-size:16px;font-weight:500;color:${INK};text-decoration:none;border-radius:999px;">${text(p.cta.label)}</a>
                      </td>
                    </tr>
                  </table>
                  ${p.note ? `<p style="margin:22px 0 0;font-family:${SANS};font-size:12px;line-height:1.5;color:${BG};opacity:0.6;">${text(p.note)}</p>` : ""}
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:22px 6px 0;font-family:${SANS};font-size:12px;line-height:1.55;color:${INK};opacity:0.6;">
            ${text(p.footer)}<br>
            <a href="${url}" style="color:${INK};word-break:break-all;">${url}</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/** Plain-text version (for clients that don't show HTML, and spam filters). */
export function emailText(p: EmailParts): string {
  return [p.eyebrow, "", p.title, p.meta ?? "", "", p.body ?? "", "", `${p.cta.label}: ${p.cta.url}`, "", p.note ?? "", "", `— ${BRAND}`, p.footer]
    .filter((l, i, a) => !(l === "" && a[i - 1] === ""))
    .join("\n")
    .trim();
}

/** "Adam invited you to plan Vienna & Budapest". */
export function tripInviteEmail(o: { inviter: string; tripName: string; dates: string; places: string[]; url: string; siteUrl: string }) {
  const parts: EmailParts = {
    preheader: `${o.inviter} invited you to plan ${o.tripName} together.`,
    eyebrow: `${o.inviter} invited you to plan`,
    title: o.tripName,
    meta: [o.dates, o.places.join(" · ")].filter(Boolean).join("  ·  "),
    body: "Join the trip to see the plan and add to it together — flights, stays, places to eat and explore, and the day-by-day itinerary.",
    cta: { label: "Join the trip", url: o.url },
    note: "You'll be asked to log in or create a free account first. This link works for 14 days.",
    footer: `You're getting this because ${o.inviter} invited you to a trip on ${BRAND}. Not expecting it? You can ignore this email.`,
    siteUrl: o.siteUrl,
  };
  return { subject: `${o.inviter} invited you to plan ${o.tripName}`, html: emailHtml(parts), text: emailText(parts) };
}

/** Supabase's own emails (sign-up confirmation, log-in link, password reset, email change, invite), in the same design. */
export function supabaseTemplates() {
  const site = "{{ .SiteURL }}";
  const cta = "{{ .ConfirmationURL }}";
  const base = { siteUrl: site, footer: `You're getting this because someone used this address on ${BRAND}. If it wasn't you, you can ignore this email.` };
  return {
    "confirm-signup": {
      subject: `Confirm your email for ${BRAND}`,
      html: emailHtml({ ...base, preheader: "One click and you're in.", eyebrow: `Welcome to ${BRAND}`, title: "Confirm your email", body: "Tap the button to confirm your email and start planning — curated places to eat and explore, plus flights, stays and your itinerary, all in one place.", cta: { label: "Confirm email", url: cta } }),
    },
    "magic-link": {
      subject: `Your log-in link for ${BRAND}`,
      html: emailHtml({ ...base, preheader: "Your link to log in.", eyebrow: `Log in to ${BRAND}`, title: "Here's your log-in link", body: "Tap the button to log straight in. The link only works once and expires soon.", cta: { label: "Log in", url: cta } }),
    },
    "reset-password": {
      subject: `Reset your ${BRAND} password`,
      html: emailHtml({ ...base, preheader: "Choose a new password.", eyebrow: "Password reset", title: "Choose a new password", body: "Tap the button to set a new password. If you didn't ask for this, you can ignore this email — your password won't change.", cta: { label: "Set a new password", url: cta } }),
    },
    "change-email": {
      subject: `Confirm your new email for ${BRAND}`,
      html: emailHtml({ ...base, preheader: "Confirm your new email address.", eyebrow: "Email change", title: "Confirm your new email", body: "Tap the button to confirm {{ .NewEmail }} as your new email address.", cta: { label: "Confirm new email", url: cta } }),
    },
    invite: {
      subject: `You've been invited to ${BRAND}`,
      html: emailHtml({ ...base, preheader: "You've been invited.", eyebrow: "You've been invited", title: `Join ${BRAND}`, body: "Tap the button to accept the invitation and create your account.", cta: { label: "Accept invitation", url: cta } }),
    },
  };
}
