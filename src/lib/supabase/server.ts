import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { SUPABASE_KEY, SUPABASE_URL, supabaseEnabled } from "./env";

/** Supabase as the signed-in user (from the request's cookies), for route handlers and server components. */
export async function supabaseServer(): Promise<SupabaseClient | null> {
  if (!supabaseEnabled) return null;
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* called from a server component: the middleware refreshes cookies instead */
        }
      },
    },
  });
}

/** Supabase with the secret key: bypasses row-level security. Server only — never expose it. */
export function supabaseAdmin(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !key) return null;
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** The signed-in user, or null (always null when Supabase isn't set up). */
export async function currentUser(): Promise<User | null> {
  const sb = await supabaseServer();
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  return data.user ?? null;
}

/** Whether the signed-in user is an admin (profiles.is_admin). */
export async function isAdminUser(user: User | null): Promise<boolean> {
  if (!user) return false;
  const sb = await supabaseServer();
  const { data } = (await sb?.from("profiles").select("is_admin").eq("id", user.id).maybeSingle()) ?? { data: null };
  return Boolean(data?.is_admin);
}
