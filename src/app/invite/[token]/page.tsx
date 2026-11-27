"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { HeroBackground, MarketingNav } from "@/components/marketing/MarketingNav";
import { rangeLabel } from "@/lib/format";
import { supabaseBrowser } from "@/lib/supabase/client";

interface Preview {
  trip_id: string;
  trip_name: string;
  start_date: string;
  end_date: string;
  invited_by: string;
  valid: boolean;
  already_in: boolean;
}

/** Opening an invite link: shows the trip and who invited you, then joins it. (Logging in comes first — see middleware.) */
export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const sb = supabaseBrowser();
  const [preview, setPreview] = useState<Preview | null | "missing">(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sb) return setPreview("missing");
    sb.rpc("invite_preview", { tok: token }).then(({ data, error }) => {
      if (error) return setError(error.message);
      const row = (data as Preview[] | null)?.[0];
      setPreview(row ?? "missing");
    });
  }, [sb, token]);

  const join = async () => {
    if (!sb) return;
    setBusy(true);
    const { data, error } = await sb.rpc("accept_trip_invite", { tok: token });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    // Full load so the trip and everything in it is loaded for your account
    window.location.href = `/trips/${data}`;
  };

  const p = typeof preview === "object" ? preview : null;
  return (
    <div className="relative min-h-[100svh] overflow-hidden isolate">
      <HeroBackground blur />
      <MarketingNav />
      <main className="relative z-10 min-h-[100svh] flex items-center justify-center px-5 pt-28 pb-16">
        <div className="w-full max-w-[440px] rounded-3xl bg-canvas/95 backdrop-blur shadow-2xl p-8 space-y-4">
          {preview === null && !error && <div className="h-28 rounded-xl bg-surface animate-pulse" />}
          {(preview === "missing" || (p && !p.valid)) && (
            <>
              <h1 className="font-serif text-[30px] leading-tight">This invite has expired</h1>
              <p className="text-[14px] text-ink-muted">Ask whoever sent it for a new link.</p>
            </>
          )}
          {p && p.valid && (
            <>
              <p className="text-[14px] text-ink-muted">{p.invited_by} invited you to plan</p>
              <h1 className="font-serif text-[34px] leading-tight">{p.trip_name}</h1>
              <p className="text-[14px] text-ink-muted">{rangeLabel(p.start_date, p.end_date)}</p>
              {p.already_in ? (
                <Link href={`/trips/${p.trip_id}`} className="block text-center h-11 leading-[44px] rounded-full bg-accent text-white text-[15px] hover:bg-accent-hover">
                  You&apos;re already on this trip — open it
                </Link>
              ) : (
                <button type="button" onClick={join} disabled={busy} className="w-full h-11 rounded-full bg-accent text-white text-[15px] hover:bg-accent-hover disabled:opacity-60">
                  {busy ? "Joining…" : "Join trip"}
                </button>
              )}
              <p className="text-[12px] text-ink-muted">You&apos;ll be able to see and edit everything in this trip.</p>
            </>
          )}
          {error && <p className="text-[13px] text-price-up">{error}</p>}
        </div>
      </main>
    </div>
  );
}
