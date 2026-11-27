import "server-only";
import { createTransport, type Transporter } from "nodemailer";

/**
 * Sends an email, through either:
 * - Resend (https://resend.com) when RESEND_API_KEY is set — best once you have your own domain; or
 * - SMTP, e.g. a Gmail account with an app password: SMTP_USER + SMTP_PASS
 *   (SMTP_HOST defaults to smtp.gmail.com, SMTP_PORT to 465).
 * EMAIL_FROM sets the sender, e.g. "wheretonext <you@gmail.com>" (Gmail only sends from your own address).
 */
export const emailEnabled = () => Boolean(process.env.RESEND_API_KEY || (process.env.SMTP_USER && process.env.SMTP_PASS));

type Message = { to: string; subject: string; html: string; text: string; replyTo?: string };

export async function sendEmail(m: Message) {
  if (process.env.RESEND_API_KEY) return sendWithResend(m);
  if (process.env.SMTP_USER && process.env.SMTP_PASS) return sendWithSmtp(m);
  throw new Error("Email isn't set up (add SMTP_USER and SMTP_PASS, or RESEND_API_KEY).");
}

async function sendWithResend(m: Message) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
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

let transport: Transporter | null = null;

async function sendWithSmtp(m: Message) {
  const port = Number(process.env.SMTP_PORT || 465);
  transport ??= createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS?.replace(/\s+/g, "") }, // Gmail shows app passwords with spaces
  });
  try {
    await transport.sendMail({
      from: process.env.EMAIL_FROM || `wheretonext <${process.env.SMTP_USER}>`,
      to: m.to,
      subject: m.subject,
      html: m.html,
      text: m.text,
      replyTo: m.replyTo,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/Invalid login|Username and Password not accepted|535/i.test(msg)) {
      throw new Error("The email account rejected the login — check SMTP_USER and the app password (SMTP_PASS).");
    }
    throw new Error(`Email failed: ${msg}`);
  }
}
