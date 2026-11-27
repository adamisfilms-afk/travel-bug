"use client";

import Link from "next/link";
import { useState } from "react";
import { HeroBackground, MarketingNav } from "@/components/marketing/MarketingNav";
import { BRAND } from "@/lib/brand";

/** Placeholder: accounts aren't built yet, so the form doesn't sign anyone in. */
export default function LoginPage() {
  const [sent, setSent] = useState(false);
  return (
    <div className="relative min-h-[100svh] overflow-hidden isolate">
      <HeroBackground blur />
      <MarketingNav />
      <main className="relative z-10 min-h-[100svh] flex items-center justify-center px-5 pt-28 pb-16">
        <div className="w-full max-w-[420px] rounded-3xl bg-canvas/95 backdrop-blur shadow-2xl p-8">
          <h1 className="font-serif text-[30px] leading-tight">Log in to {BRAND}</h1>
          <p className="mt-1 text-[14px] text-ink-muted">Welcome back — pick up where you left off.</p>
          <form
            className="mt-6 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
          >
            <label className="block text-[13px] text-ink-muted">
              Email
              <input type="email" required autoComplete="email" className="mt-1 h-11 w-full rounded-lg bg-surface px-3 text-[15px] text-ink outline-none border border-line focus:border-accent-soft" />
            </label>
            <label className="block text-[13px] text-ink-muted">
              Password
              <input type="password" required autoComplete="current-password" className="mt-1 h-11 w-full rounded-lg bg-surface px-3 text-[15px] text-ink outline-none border border-line focus:border-accent-soft" />
            </label>
            <button type="submit" className="mt-2 h-11 w-full rounded-full bg-accent text-white text-[15px] hover:bg-accent-hover">
              Log in
            </button>
          </form>
          {sent && (
            <p role="status" className="mt-4 rounded-lg bg-guide-active/40 px-3 py-2 text-[13px]">
              Accounts are coming soon — logging in isn&apos;t switched on yet.
            </p>
          )}
          <p className="mt-6 text-center text-[14px]">
            <Link href="/home" className="text-accent-ink underline underline-offset-4">
              Continue without an account
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
