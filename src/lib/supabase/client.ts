"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL, supabaseEnabled } from "./env";

let client: SupabaseClient | null = null;

/** The browser's Supabase client (signed in as the current user via cookies), or null when Supabase isn't set up. */
export function supabaseBrowser(): SupabaseClient | null {
  if (!supabaseEnabled) return null;
  return (client ??= createBrowserClient(SUPABASE_URL, SUPABASE_KEY));
}
