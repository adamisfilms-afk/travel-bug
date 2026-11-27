import { promises as fs } from "node:fs";
import { NextResponse } from "next/server";
import { CAN_WRITE, OVERRIDES_FILE, readOverrides } from "@/lib/curated/overrides-server";

export const dynamic = "force-dynamic";

/** Admin edits to curated places (see src/lib/curated/overrides.ts). */
export async function GET() {
  return NextResponse.json(await readOverrides(), { headers: { "Cache-Control": "no-store" } });
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : undefined);
const isUrl = (s: string) => /^https?:\/\/\S+$/i.test(s) || /^\/curated\/[\w./-]+$/.test(s);

/** Replace one place's edits. Body: { id, override } (override null = remove all edits). */
export async function PUT(req: Request) {
  if (!CAN_WRITE) return NextResponse.json({ error: "Editing is only available when running locally." }, { status: 403 });
  const body = await req.json().catch(() => null);
  const id = str(body?.id, 100);
  if (!id || !/^[\w-]+$/.test(id)) return NextResponse.json({ error: "Bad place id." }, { status: 400 });

  const all = await readOverrides();
  const o = body.override;
  if (o == null) delete all[id];
  else {
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
      photos,
    };
    all[id] = Object.fromEntries(Object.entries(clean).filter(([, v]) => v !== undefined));
  }
  await fs.mkdir(OVERRIDES_FILE.replace(/[/\\][^/\\]+$/, ""), { recursive: true });
  await fs.writeFile(OVERRIDES_FILE, JSON.stringify(all, null, 2) + "\n");
  return NextResponse.json(all);
}
