import { NextResponse } from "next/server";
import { canEdit, readOverrides, writeOverride } from "@/lib/curated/overrides-server";

export const dynamic = "force-dynamic";

/** Admin edits to curated places (see src/lib/curated/overrides.ts). */
export async function GET() {
  try {
    return NextResponse.json(await readOverrides(), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[curated/overrides]", e);
    return NextResponse.json({}, { headers: { "Cache-Control": "no-store" } });
  }
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : undefined);
const isUrl = (s: string) => /^https?:\/\/\S+$/i.test(s) || /^\/curated\/[\w./-]+$/.test(s);

/** Replace one place's edits. Body: { id, override } (override null = remove all edits). */
export async function PUT(req: Request) {
  const allowed = await canEdit();
  if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
  const body = await req.json().catch(() => null);
  const id = str(body?.id, 100);
  if (!id || !/^[\w-]+$/.test(id)) return NextResponse.json({ error: "Bad place id." }, { status: 400 });

  const o = body.override;
  let next: Record<string, unknown> | null = null;
  if (o != null) {
    const photos = Array.isArray(o.photos)
      ? o.photos
          .slice(0, 40)
          .map((p: { kind?: string; name?: unknown; src?: unknown }) =>
            p?.kind === "google" && typeof p.name === "string" && /^places\/[\w-]+\/photos\/[\w-]+$/.test(p.name)
              ? { kind: "google", name: p.name }
              : p?.kind === "url" && typeof p.src === "string" && isUrl(p.src)
                ? { kind: "url", src: p.src }
                : null,
          )
          .filter(Boolean)
      : undefined;
    const price = o.priceLevel === null ? null : Number.isInteger(o.priceLevel) && o.priceLevel >= 1 && o.priceLevel <= 4 ? o.priceLevel : undefined;
    const clean = {
      name: str(o.name, 120) || undefined,
      tagline: str(o.tagline, 60),
      neighbourhood: str(o.neighbourhood, 80) || undefined,
      description: str(o.description, 3000),
      priceLevel: price,
      social: Array.isArray(o.social) ? o.social.map((u: unknown) => str(u, 500)).filter((u: string | undefined) => u && isUrl(u)).slice(0, 30) : undefined,
      bookingUrl: typeof o.bookingUrl === "string" ? (isUrl(o.bookingUrl.trim()) ? o.bookingUrl.trim().slice(0, 1000) : "") : undefined,
      photos,
      hidden: o.hidden === true ? true : undefined,
    };
    next = Object.fromEntries(Object.entries(clean).filter(([, v]) => v !== undefined));
  }
  try {
    return NextResponse.json(await writeOverride(id, next));
  } catch (e) {
    console.error("[curated/overrides]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't save." }, { status: 500 });
  }
}
