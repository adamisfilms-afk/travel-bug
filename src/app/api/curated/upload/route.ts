import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { CAN_WRITE, UPLOADS_DIR } from "@/lib/curated/overrides-server";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif", "image/gif": "gif" };
const MAX_BYTES = 15 * 1024 * 1024;

/** Saves an uploaded photo to public/curated/uploads/ and returns its URL. Local admin only. */
export async function POST(req: Request) {
  if (!CAN_WRITE) return NextResponse.json({ error: "Uploading is only available when running locally." }, { status: 403 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const place = String(form?.get("place") ?? "photo").replace(/[^\w-]/g, "").slice(0, 60) || "photo";
  if (!(file instanceof File)) return NextResponse.json({ error: "No file." }, { status: 400 });
  const ext = TYPES[file.type];
  if (!ext) return NextResponse.json({ error: "Use a JPEG, PNG, WebP, AVIF or GIF image." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Images must be under 15 MB." }, { status: 400 });

  const name = `${place}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.${ext}`;
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOADS_DIR, name), Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ src: `/curated/uploads/${name}` });
}
