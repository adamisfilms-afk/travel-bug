"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAccountInfo } from "@/lib/auth";
import { supabaseBrowser } from "@/lib/supabase/client";
import { SectionTitle } from "./ui";

const field = "h-10 w-full rounded-lg bg-surface px-3 text-[14px] outline-none border border-line focus:border-accent-soft";

/** Settings → Account: name, password and log out (only when accounts are switched on). */
export function AccountSettings() {
  const account = useAccountInfo();
  const params = useSearchParams();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => setName(account.name ?? ""), [account.name]);
  const choosingPassword = params.get("password") === "new";

  if (!account.enabled) return null;

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await account.setName(name.trim());
      setNote({ ok: true, text: "Name saved." });
    } catch (err) {
      setNote({ ok: false, text: err instanceof Error ? err.message : "Couldn't save." });
    }
  };
  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = (await supabaseBrowser()?.auth.updateUser({ password })) ?? {};
    setPassword("");
    setNote(error ? { ok: false, text: error.message } : { ok: true, text: "Password updated." });
  };

  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between gap-4">
        <SectionTitle>Account</SectionTitle>
        {note && <span className={note.ok ? "text-[13px] text-accent-ink" : "text-[13px] text-price-up"}>{note.text}</span>}
      </div>
      <p className="text-[14px] text-ink-muted">
        Signed in as <span className="text-ink">{account.email ?? "…"}</span>
        {account.isAdmin && " · admin"}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
        <form onSubmit={saveName} className="space-y-2">
          <label className="block text-[13px] text-ink-muted">
            First name
            <input value={name} onChange={(e) => setName(e.target.value)} className={`${field} mt-1`} />
          </label>
          <button type="submit" className="h-9 px-4 rounded-full bg-accent text-white text-[14px] hover:bg-accent-hover">
            Save name
          </button>
        </form>
        <form onSubmit={savePassword} className="space-y-2">
          <label className="block text-[13px] text-ink-muted">
            {choosingPassword ? "Choose a new password" : "New password"}
            <input
              type="password"
              minLength={8}
              required
              autoFocus={choosingPassword}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${field} mt-1 ${choosingPassword ? "border-accent" : ""}`}
            />
          </label>
          <button type="submit" className="h-9 px-4 rounded-full bg-accent text-white text-[14px] hover:bg-accent-hover">
            Update password
          </button>
        </form>
      </div>
      <button type="button" onClick={() => void account.signOut()} className="h-9 px-4 rounded-full border border-line bg-surface text-[14px] hover:border-ink/40">
        Log out
      </button>
    </section>
  );
}
