/** Supabase is switched on by setting these two (public) values; without them the app runs locally with no accounts. */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const supabaseEnabled = Boolean(SUPABASE_URL && SUPABASE_KEY);
