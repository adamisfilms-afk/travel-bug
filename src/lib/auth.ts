"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { supabaseBrowser } from "./supabase/client";
import { supabaseEnabled } from "./supabase/env";

interface Account {
  /** Supabase is set up (accounts exist). Without it the app is a single local user. */
  enabled: boolean;
  loaded: boolean;
  /** The signed-in user's id. */
  id: string | null;
  email: string | null;
  name: string | null;
  isAdmin: boolean;
  load: () => Promise<void>;
  setName: (name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

let listening = false;

export const useAccount = create<Account>((set, get) => ({
  enabled: supabaseEnabled,
  loaded: !supabaseEnabled,
  id: null,
  email: null,
  name: null,
  isAdmin: false,
  async load() {
    const sb = supabaseBrowser();
    if (!sb) return;
    if (!listening) {
      listening = true;
      sb.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") void get().load();
      });
    }
    const { data } = await sb.auth.getUser();
    const user = data.user;
    if (!user) return set({ loaded: true, id: null, email: null, name: null, isAdmin: false });
    const { data: profile } = await sb.from("profiles").select("name, is_admin").eq("id", user.id).maybeSingle();
    set({
      loaded: true,
      id: user.id,
      email: user.email ?? null,
      name: profile?.name ?? (user.user_metadata?.name as string | undefined) ?? null,
      isAdmin: Boolean(profile?.is_admin),
    });
  },
  async setName(name) {
    const sb = supabaseBrowser();
    if (!sb) return;
    const { data } = await sb.auth.getUser();
    if (!data.user) return;
    const { error } = await sb.from("profiles").update({ name }).eq("id", data.user.id);
    if (error) throw new Error(error.message);
    set({ name });
  },
  async signOut() {
    await supabaseBrowser()?.auth.signOut();
    // Start clean: drop the signed-out user's trips from memory
    window.location.href = "/";
  },
}));

/** The current account (loads it once). */
export function useAccountInfo() {
  const account = useAccount();
  useEffect(() => {
    if (account.enabled && !account.loaded) void account.load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account.enabled, account.loaded]);
  return account;
}

/** First name for greetings ("Adam"), with a fallback. */
export function firstName(name: string | null | undefined, fallback = "there") {
  return name?.trim().split(/\s+/)[0] || fallback;
}
