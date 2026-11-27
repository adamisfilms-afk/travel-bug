import "server-only";

/**
 * Sends an email through Resend (https://resend.com) using its HTTP API.
 * Needs RESEND_API_KEY; EMAIL_FROM sets the sender, e.g. "wheretonext <hello@yourdomain.com>"
 * (the domain must be verified in Resend — until then Resend only delivers to your own address).
 */
export const emailEnabled = () => Boolean(process.env.RESEND_API_KEY);

export async function sendEmail(m: { to: string; subject: string; html: string; text: string; replyTo?: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Email isn't set up (RESEND_API_KEY is missing).");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "wheretonext <onboarding@resend.dev>",
      to: [m.to],
      subject: m.subject,
      html: m.html,
      text: m.text,
      ...(m.replyTo ? { reply_to: m.replyTo } : {}),
    }),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new Error(detail?.message ?? `Email failed (${res.status})`);
  }
}
