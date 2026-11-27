import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { canEdit, UPLOADS_DIR } from "@/lib/curated/overrides-server";
import { supabaseEnabled } from "@/lib/supabase/env";
import { supabaseAdmin } from "@/lib/supabase/server";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif", "image/gif": "gif" };
const MAX_BYTES = 15 * 1024 * 1024;
const fileName = (place: string, ext: string) => `${place}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.${ext}`;

/**
 * Admin photo uploads.
 * - With Supabase: body { place, type, size } → a one-time signed upload URL for the "curated"
 *   Storage bucket (the browser uploads straight to Storage, so large photos aren't limited by
 *   the server's request size) plus the photo's public URL.
 * - Without it (local development): multipart form with `file` → saved to public/curated/uploads/.
 */
export async function POST(req: Request) {
  const allowed = await canEdit();
  if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });

  if (supabaseEnabled) {
    const body = await req.json().catch(() => null);
    const ext = TYPES[body?.type];
    const place = String(body?.place ?? "photo").replace(/[^\w-]/g, "").slice(0, 60) || "photo";
    if (!ext) return NextResponse.json({ error: "Use a JPEG, PNG, WebP, AVIF or GIF image." }, { status: 400 });
    if (Number(body?.size) > MAX_BYTES) return NextResponse.json({ error: "Images must be under 15 MB." }, { status: 400 });
    const admin = supabaseAdmin();
    if (!admin) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY isn't set on the server." }, { status: 500 });
    const key = `places/${fileName(place, ext)}`;
    const { data, error } = await admin.storage.from("curated").createSignedUploadUrl(key);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const { data: pub } = admin.storage.from("curated").getPublicUrl(key);
    return NextResponse.json({ path: key, token: data.token, src: pub.publicUrl });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const place = String(form?.get("place") ?? "photo").replace(/[^\w-]/g, "").slice(0, 60) || "photo";
  if (!(file instanceof File)) return NextResponse.json({ error: "No file." }, { status: 400 });
  const ext = TYPES[file.type];
  if (!ext) return NextResponse.json({ error: "Use a JPEG, PNG, WebP, AVIF or GIF image." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Images must be under 15 MB." }, { status: 400 });
  const name = fileName(place, ext);
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOADS_DIR, name), Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ src: `/curated/uploads/${name}` });
}
