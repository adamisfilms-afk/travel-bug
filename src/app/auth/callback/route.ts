import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Where links in Supabase's emails land (confirm sign-up, magic link, password reset):
 * swaps the one-time code for a session cookie, then continues to `next`.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const n = url.searchParams.get("next");
  const next = n?.startsWith("/") && !n.startsWith("//") ? n : "/home";
  const sb = await supabaseServer();
  if (!sb) return NextResponse.redirect(new URL("/home", req.url));

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const { error } = code
    ? await sb.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await sb.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("Missing code") };

  if (error) return NextResponse.redirect(new URL(`/login?error=link&next=${encodeURIComponent(next)}`, req.url));
  return NextResponse.redirect(new URL(next, req.url));
}
