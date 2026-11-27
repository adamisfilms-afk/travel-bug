import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Keeps the Supabase session fresh on every request and sends signed-out visitors to the login
 * page. Public: the landing page, login, auth callbacks, shared itineraries and API routes
 * (paid API routes check the user themselves). Does nothing until Supabase is configured.
 */
const PUBLIC = [/^\/$/, /^\/login/, /^\/auth\//, /^\/share\//, /^\/api\//];

export async function middleware(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next();

  let res = NextResponse.next({ request: req });
  const sb = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const {
    data: { user },
  } = await sb.auth.getUser();

  const path = req.nextUrl.pathname;
  if (!user && !PUBLIC.some((r) => r.test(path))) {
    const to = req.nextUrl.clone();
    to.pathname = "/login";
    to.search = `?next=${encodeURIComponent(path + req.nextUrl.search)}`;
    return NextResponse.redirect(to);
  }
  if (user && path === "/login") {
    const next = req.nextUrl.searchParams.get("next");
    return NextResponse.redirect(new URL(next?.startsWith("/") && !next.startsWith("//") ? next : "/home", req.url));
  }
  return res;
}

export const config = {
  // Everything except static files and images
  matcher: ["/((?!_next/static|_next/image|favicon.ico|landing/|curated/|.*\\.(?:png|jpg|jpeg|svg|webp|avif|gif|ico)$).*)"],
};
