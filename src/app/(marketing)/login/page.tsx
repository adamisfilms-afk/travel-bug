"use client";

import clsx from "clsx";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { HeroBackground, MarketingNav } from "@/components/marketing/MarketingNav";
import { BRAND } from "@/lib/brand";
import { supabaseBrowser } from "@/lib/supabase/client";

type Mode = "login" | "signup" | "link" | "reset";

const field = "mt-1 h-11 w-full rounded-lg bg-surface px-3 text-[15px] text-ink outline-none border border-line focus:border-accent-soft";

function LoginCard() {
  const params = useSearchParams();
  const sb = supabaseBrowser();
  const next = (() => {
    const n = params.get("next");
    return n?.startsWith("/") && !n.startsWith("//") ? n : "/home";
  })();
  // Arriving from an invite link: say who invited you, and start on sign-up (most invitees are new)
  const invite = (() => {
    if (!next.startsWith("/invite/")) return null;
    const q = new URLSearchParams(next.split("?")[1] ?? "");
    return { trip: q.get("trip"), from: q.get("from") };
  })();
  const [mode, setMode] = useState<Mode>(params.get("mode") === "signup" || (invite && params.get("mode") !== "login") ? "signup" : "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(
    params.get("error") ? { kind: "error", text: "That link has expired or was already used — try again." } : null,
  );
  const callback = (to: string) => `${window.location.origin}/auth/callback?next=${encodeURIComponent(to)}`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sb) return;
    setBusy(true);
    setMessage(null);
    try {
      if (mode === "login") {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = next; // full load so your trips load for your account
        return;
      }
      if (mode === "signup") {
        const { data, error } = await sb.auth.signUp({ email, password, options: { data: { name: name.trim() }, emailRedirectTo: callback(next) } });
        if (error) throw error;
        if (data.session) {
          window.location.href = next;
          return;
        }
        setMessage({ kind: "ok", text: `Check ${email} — we've sent a link to confirm your account.` });
      }
      if (mode === "link") {
        const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: callback(next) } });
        if (error) throw error;
        setMessage({ kind: "ok", text: `Check ${email} — we've sent you a link to log in.` });
      }
      if (mode === "reset") {
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: callback("/settings?password=new") });
        if (error) throw error;
        setMessage({ kind: "ok", text: `Check ${email} — we've sent a link to choose a new password.` });
      }
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setBusy(false);
    }
  };

  // Accounts not set up yet (no Supabase keys): keep the old placeholder
  if (!sb)
    return (
      <div className="w-full max-w-[420px] rounded-3xl bg-canvas/95 backdrop-blur shadow-2xl p-8">
        <h1 className="font-serif text-[30px] leading-tight">Log in to {BRAND}</h1>
        <p className="mt-3 rounded-lg bg-guide-active/40 px-3 py-2 text-[13px]">Accounts aren&apos;t switched on yet.</p>
        <p className="mt-6 text-center text-[14px]">
          <Link href="/home" className="text-accent-ink underline underline-offset-4">
            Continue without an account
          </Link>
        </p>
      </div>
    );

  const title = { login: `Log in to ${BRAND}`, signup: "Create your account", link: "Log in with a link", reset: "Reset your password" }[mode];
  const button = { login: "Log in", signup: "Create account", link: "Email me a link", reset: "Send reset link" }[mode];

  return (
    <div className="w-full max-w-[420px] rounded-3xl bg-canvas/95 backdrop-blur shadow-2xl p-8">
      {(mode === "login" || mode === "signup") && (
        <div className="mb-5 grid grid-cols-2 rounded-full bg-surface p-1 text-[14px]">
          {(["login", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => (setMode(m), setMessage(null))}
              className={clsx("h-9 rounded-full transition-colors", mode === m ? "bg-accent text-white" : "hover:bg-surface-strong")}
            >
              {m === "login" ? "Log in" : "Sign up"}
            </button>
          ))}
        </div>
      )}
      {invite && (
        <p className="mb-4 rounded-xl bg-guide-active/45 px-4 py-3 text-[14px] leading-snug">
          {invite.from ? <b className="font-semibold">{invite.from}</b> : "You've been"} {invite.from ? "invited you to plan" : "invited to plan"}{" "}
          {invite.trip ? <b className="font-semibold">{invite.trip}</b> : "a trip"}. {mode === "signup" ? "Create a free account to join — already have one? Log in." : "Log in to join."}
        </p>
      )}
      <h1 className="font-serif text-[30px] leading-tight">{title}</h1>
      <p className="mt-1 text-[14px] text-ink-muted">
        {mode === "signup"
          ? "Save trips, plan your days and keep it all in one place."
          : mode === "link"
            ? "We'll email you a link that logs you straight in."
            : mode === "reset"
              ? "We'll email you a link to choose a new password."
              : "Welcome back — pick up where you left off."}
      </p>

      <form className="mt-6 space-y-3" onSubmit={submit}>
        {mode === "signup" && (
          <label className="block text-[13px] text-ink-muted">
            First name
            <input required autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} className={field} />
          </label>
        )}
        <label className="block text-[13px] text-ink-muted">
          Email
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
        </label>
        {(mode === "login" || mode === "signup") && (
          <label className="block text-[13px] text-ink-muted">
            <span className="flex justify-between">
              Password
              {mode === "login" && (
                <button type="button" onClick={() => (setMode("reset"), setMessage(null))} className="underline underline-offset-2 hover:text-ink">
                  Forgot?
                </button>
              )}
            </span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={field}
            />
          </label>
        )}
        <button type="submit" disabled={busy} className="mt-2 h-11 w-full rounded-full bg-accent text-white text-[15px] hover:bg-accent-hover disabled:opacity-60">
          {busy ? "One moment…" : button}
        </button>
      </form>

      {message && (
        <p role="status" className={clsx("mt-4 rounded-lg px-3 py-2 text-[13px]", message.kind === "ok" ? "bg-guide-active/40" : "bg-price-up/15 text-price-up")}>
          {message.text}
        </p>
      )}

      <p className="mt-6 text-center text-[14px]">
        {mode === "login" || mode === "signup" ? (
          <button type="button" onClick={() => (setMode("link"), setMessage(null))} className="text-accent-ink underline underline-offset-4">
            Email me a log-in link instead
          </button>
        ) : (
          <button type="button" onClick={() => (setMode("login"), setMessage(null))} className="text-accent-ink underline underline-offset-4">
            Back to log in
          </button>
        )}
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative min-h-[100svh] overflow-hidden isolate">
      <HeroBackground blur />
      <MarketingNav />
      <main className="relative z-10 min-h-[100svh] flex items-center justify-center px-5 pt-28 pb-16">
        <Suspense>
          <LoginCard />
        </Suspense>
      </main>
    </div>
  );
}
