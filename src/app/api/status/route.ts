import { NextResponse } from "next/server";
import { supabaseEnabled } from "@/lib/supabase/env";
import { currentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Which services this deployment is set up for — yes/no only, never the values. Open
 * /api/status on the live site (while logged in) to check the hosting environment variables.
 * NEXT_PUBLIC_ values are fixed at build time, so "builtIn" reflects the last build.
 */
export async function GET() {
  if (supabaseEnabled && !(await currentUser())) return NextResponse.json({ error: "Log in first." }, { status: 401 });
  return NextResponse.json({
    supabase: { url: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL), publishableKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY), secretKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) },
    searchApi: Boolean(process.env.SEARCHAPI_API_KEY),
    googleMaps: Boolean(process.env.GOOGLE_MAPS_API_KEY),
    mapbox: { tokenBuiltIn: Boolean(process.env.NEXT_PUBLIC_MAPBOX_TOKEN), style: process.env.NEXT_PUBLIC_MAPBOX_STYLE ?? "mapbox/light-v11 (default)" },
  });
}
