"use client";

import { Check, Copy, PaperPlaneTilt, X } from "@phosphor-icons/react";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { firstName, useAccountInfo } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { inviteUrl } from "@/lib/site";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Trip } from "@/lib/types";
import { Modal } from "./ui";

interface Person {
  user_id: string;
  name: string | null;
  email: string | null;
  is_owner: boolean;
  is_you: boolean;
}

/** Whether the signed-in user owns this trip (trips made on this device before reloading have no owner yet). */
export function useOwnsTrip(trip: Trip | undefined) {
  const account = useAccountInfo();
  return !trip?.userId || !account.id || trip.userId === account.id;
}

/** Paper-plane button in the planner header that opens the "Plan together" dialog. */
export function ShareTripButton({ trip }: { trip: Trip }) {
  const account = useAccountInfo();
  const [open, setOpen] = useState(false);
  if (!account.enabled) return null; // needs accounts
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Invite people to plan this trip with you"
        className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-surface hover:bg-white text-ink text-[14px]"
      >
        <PaperPlaneTilt className="size-3.5" /> Invite
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Plan together">
        {open && <ShareTripPanel trip={trip} onClose={() => setOpen(false)} />}
      </Modal>
    </>
  );
}

function ShareTripPanel({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const sb = supabaseBrowser()!;
  const router = useRouter();
  const forgetTrip = useStore((s) => s.forgetTrip);
  const owns = useOwnsTrip(trip);
  const account = useAccountInfo();
  const [people, setPeople] = useState<Person[] | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState("");
  const [invited, setInvited] = useState<{ email: string; sent_at: string }[]>([]);

  const loadPeople = useCallback(async () => {
    const { data, error } = await sb.rpc("trip_people", { tid: trip.id });
    if (error) return setError(friendly(error.message));
    setPeople((data as Person[]) ?? []);
    // Emailed invites (the table may not exist until 003_email_invites.sql has been run)
    const { data: inv } = await sb.from("trip_invite_emails").select("email, sent_at").eq("trip_id", trip.id).order("sent_at", { ascending: false });
    setInvited((inv as { email: string; sent_at: string }[] | null) ?? []);
  }, [sb, trip.id]);

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const to = email.trim();
    if (!to) return;
    setSending(true);
    setError("");
    setSent("");
    try {
      const res = await fetch(`/api/trips/${encodeURIComponent(trip.id)}/invite`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: to }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Couldn't send the invite.");
      setSent(`Invite sent to ${to}`);
      setEmail("");
      void loadPeople();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send the invite.");
    } finally {
      setSending(false);
    }
  };
  useEffect(() => void loadPeople(), [loadPeople]);

  const makeLink = async (reset = false) => {
    setBusy(true);
    setError("");
    try {
      if (reset) {
        const { error } = await sb.rpc("reset_trip_invites", { tid: trip.id });
        if (error) throw error;
      }
      const { data, error } = await sb.rpc("create_trip_invite", { tid: trip.id });
      if (error) throw error;
      const url = inviteUrl(String(data), { name: trip.name, from: account.name ? firstName(account.name, "") : null });
      setLink(url);
      await navigator.clipboard.writeText(url).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      setError(friendly(e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  };

  // Emailed invites still waiting (hide anyone who has since joined; latest invite per address)
  const joined = new Set((people ?? []).map((p) => p.email?.toLowerCase()));
  const pending = invited.filter((i, n) => !joined.has(i.email.toLowerCase()) && invited.findIndex((x) => x.email === i.email) === n);

  const remove = async (p: Person) => {
    const leaving = p.is_you;
    if (!confirm(leaving ? `Leave "${trip.name}"? You'll lose access unless someone invites you again.` : `Remove ${p.name ?? p.email} from "${trip.name}"?`)) return;
    const { error } = await sb.rpc("remove_trip_member", { tid: trip.id, uid: p.user_id });
    if (error) return setError(friendly(error.message));
    if (leaving) {
      forgetTrip(trip.id);
      onClose();
      router.push("/trips");
    } else void loadPeople();
  };

  return (
    <div className="space-y-6">
      <form onSubmit={sendInvite} className="space-y-2">
        <p className="text-[14px] text-ink-muted">
          Invite friends or family to plan with you. They can see and edit the whole trip — flights, stays, places and the itinerary.
        </p>
        <div className="flex gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Their email address"
            autoComplete="off"
            className="flex-1 min-w-0 h-10 rounded-lg bg-surface px-3 text-[14px] border border-line outline-none focus:border-accent-soft"
          />
          <button type="submit" disabled={sending} className="h-10 px-4 rounded-lg bg-accent text-white text-[14px] inline-flex items-center gap-1.5 hover:bg-accent-hover disabled:opacity-60">
            <PaperPlaneTilt className="size-4" /> {sending ? "Sending…" : "Send invite"}
          </button>
        </div>
        {sent && <p className="text-[13px] text-accent-ink">{sent}</p>}
      </form>

      <section className="space-y-3">
        <p className="text-[13px] text-ink-muted">Or share a link yourself:</p>
        {link ? (
          <div className="flex items-center gap-2">
            <input readOnly value={link} onFocus={(e) => e.target.select()} className="flex-1 min-w-0 h-10 rounded-lg bg-surface px-3 text-[13px] border border-line outline-none" />
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(link).catch(() => {});
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className={clsx("h-10 px-4 rounded-lg text-[14px] inline-flex items-center gap-1.5", copied ? "bg-guide-active text-ink" : "bg-accent text-white hover:bg-accent-hover")}
            >
              {copied ? <Check weight="bold" className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => void makeLink()}
            className="h-10 px-5 rounded-full bg-accent text-white text-[14px] inline-flex items-center gap-2 hover:bg-accent-hover disabled:opacity-60"
          >
            <Copy className="size-4" /> {busy ? "Creating link…" : "Copy invite link"}
          </button>
        )}
        {link && (
          <p className="text-[12px] text-ink-muted">
            Works for 14 days.{" "}
            <button type="button" onClick={() => void makeLink(true)} className="underline underline-offset-2 hover:text-ink">
              Reset link
            </button>{" "}
            to stop the old one working.
          </p>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-[13px] uppercase tracking-wider text-ink-muted">People on this trip</h3>
        {!people && !error && <div className="h-10 rounded-lg bg-surface animate-pulse" />}
        <ul className="divide-y divide-line/70">
          {people?.map((p) => (
            <li key={p.user_id} className="flex items-center gap-3 py-2.5">
              <span className="grid place-items-center size-8 rounded-full bg-guide-active text-ink text-[13px] font-semibold shrink-0">
                {(p.name || p.email || "?").trim()[0]?.toUpperCase()}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[14px] truncate">
                  {p.name ? firstName(p.name, p.name) : p.email}
                  {p.is_you && <span className="text-ink-muted"> (you)</span>}
                </span>
                <span className="block text-[12px] text-ink-muted truncate">{p.is_owner ? "Owner" : "Can edit"}{p.name && p.email ? ` · ${p.email}` : ""}</span>
              </span>
              {!p.is_owner && (owns || p.is_you) && (
                <button type="button" onClick={() => void remove(p)} className="inline-flex items-center gap-1 text-[13px] text-ink-muted hover:text-price-up">
                  <X className="size-3.5" /> {p.is_you ? "Leave" : "Remove"}
                </button>
              )}
            </li>
          ))}
        </ul>
        {pending.length > 0 && (
          <ul className="divide-y divide-line/70 border-t border-line/70">
            {pending.map((i) => (
              <li key={i.email} className="flex items-center gap-3 py-2.5">
                <span className="grid place-items-center size-8 rounded-full border border-dashed border-ink/30 text-ink/50 text-[13px] shrink-0">
                  {i.email[0]?.toUpperCase()}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[14px] truncate">{i.email}</span>
                  <span className="block text-[12px] text-ink-muted">Invited {new Date(i.sent_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })} · hasn&apos;t joined yet</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        {people?.length === 1 && !pending.length && <p className="text-[13px] text-ink-muted">Just you so far.</p>}
      </section>

      {error && <p className="text-[13px] text-price-up">{error}</p>}
    </div>
  );
}

/** Database errors in plain words (e.g. before the sharing SQL has been run). */
function friendly(msg: string) {
  if (/function .* does not exist|Could not find the function/i.test(msg)) return "Trip sharing isn't set up in the database yet — run supabase/002_trip_sharing.sql in Supabase.";
  if (/not allowed/i.test(msg)) return "You don't have access to share this trip.";
  return msg;
}
