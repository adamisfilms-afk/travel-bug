import { NextResponse } from "next/server";
import { tripInviteEmail } from "@/lib/email/templates";
import { emailEnabled, sendEmail } from "@/lib/email/send";
import { rangeLabel } from "@/lib/format";
import { supabaseServer } from "@/lib/supabase/server";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PER_HOUR = 20;
const g = globalThis as unknown as { __inviteSends?: Map<string, number[]> };
const sends = (g.__inviteSends ??= new Map());

/**
 * Email someone an invite to a trip: POST { email }. You must be on the trip (owner or member).
 * The email carries the trip's invite link (the same one "Copy invite link" gives).
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await supabaseServer();
  if (!sb) return NextResponse.json({ error: "Accounts aren't switched on." }, { status: 400 });
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Log in first." }, { status: 401 });
  if (!emailEnabled()) return NextResponse.json({ error: "Email invites aren't set up yet (SMTP_USER/SMTP_PASS or RESEND_API_KEY). Copy the invite link instead." }, { status: 503 });

  const body = await req.json().catch(() => null);
  const to = String(body?.email ?? "").trim().toLowerCase();
  if (!EMAIL.test(to) || to.length > 200) return NextResponse.json({ error: "That doesn't look like an email address." }, { status: 400 });
  if (to === user.email?.toLowerCase()) return NextResponse.json({ error: "That's your own email." }, { status: 400 });

  const now = Date.now();
  const recent = (sends.get(user.id) ?? []).filter((t: number) => now - t < 3_600_000);
  if (recent.length >= PER_HOUR) return NextResponse.json({ error: "You've sent a lot of invites — try again in a little while." }, { status: 429 });

  // Row-level security means this only finds the trip if you're on it
  const { data: trip } = await sb.from("trips").select("id, name, destination, locations, start_date, end_date").eq("id", id).maybeSingle();
  if (!trip) return NextResponse.json({ error: "Trip not found." }, { status: 404 });
  const { data: token, error: inviteError } = await sb.rpc("create_trip_invite", { tid: id });
  if (inviteError || !token) return NextResponse.json({ error: inviteError?.message ?? "Couldn't create the invite." }, { status: 500 });
  const { data: profile } = await sb.from("profiles").select("name").eq("id", user.id).maybeSingle();

  const origin = new URL(req.url).origin;
  const inviter = profile?.name?.trim().split(/\s+/)[0] || user.email?.split("@")[0] || "A friend";
  const email = tripInviteEmail({
    inviter,
    tripName: trip.name,
    dates: rangeLabel(trip.start_date, trip.end_date),
    places: trip.locations?.length ? trip.locations : [trip.destination],
    url: `${origin}/invite/${token}`,
    siteUrl: origin,
  });

  try {
    await sendEmail({ to, ...email, replyTo: user.email ?? undefined });
  } catch (e) {
    console.error("[invite email]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't send the email." }, { status: 502 });
  }
  recent.push(now);
  sends.set(user.id, recent);
  // Remember who was invited (shown as "Invited" until they join)
  await sb.from("trip_invite_emails").insert({ trip_id: id, email: to });
  return NextResponse.json({ ok: true });
}
