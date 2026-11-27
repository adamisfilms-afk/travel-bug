import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { supabaseEnabled } from "../supabase/env";
import { currentUser, isAdminUser, supabaseAdmin, supabaseServer } from "../supabase/server";

/**
 * Where admin edits to curated places live:
 * - with Supabase: the curated_overrides table (and uploaded photos in the "curated" Storage bucket);
 * - without it: data/curated-overrides.json and public/curated/uploads/ (local development only).
 */
export const OVERRIDES_FILE = path.join(process.cwd(), "data", "curated-overrides.json");
export const UPLOADS_DIR = path.join(process.cwd(), "public", "curated", "uploads");

async function readFile(): Promise<Record<string, unknown>> {
  try {
    return JSON.parse(await fs.readFile(OVERRIDES_FILE, "utf8"));
  } catch {
    return {};
  }
}

export async function readOverrides(): Promise<Record<string, unknown>> {
  if (!supabaseEnabled) return readFile();
  const sb = supabaseAdmin() ?? (await supabaseServer());
  const { data, error } = await sb!.from("curated_overrides").select("place_id, data");
  if (error) throw new Error(error.message);
  if (!data.length) {
    // First run with Supabase: bring over any edits made locally before (data/curated-overrides.json)
    const local = await readFile();
    const admin = supabaseAdmin();
    if (admin && Object.keys(local).length) {
      await admin.from("curated_overrides").upsert(Object.entries(local).map(([place_id, d]) => ({ place_id, data: d })));
      return local;
    }
  }
  return Object.fromEntries(data.map((r) => [r.place_id, r.data]));
}

/** Save (or with null, remove) one place's edits, then return all edits. */
export async function writeOverride(id: string, data: Record<string, unknown> | null): Promise<Record<string, unknown>> {
  if (!supabaseEnabled) {
    const all = await readFile();
    if (data) all[id] = data;
    else delete all[id];
    await fs.mkdir(path.dirname(OVERRIDES_FILE), { recursive: true });
    await fs.writeFile(OVERRIDES_FILE, JSON.stringify(all, null, 2) + "\n");
    return all;
  }
  const admin = supabaseAdmin();
  if (!admin) throw new Error("SUPABASE_SERVICE_ROLE_KEY isn't set on the server.");
  const res = data
    ? await admin.from("curated_overrides").upsert({ place_id: id, data, updated_at: new Date().toISOString() })
    : await admin.from("curated_overrides").delete().eq("place_id", id);
  if (res.error) throw new Error(res.error.message);
  return readOverrides();
}

/** Who may edit: with Supabase, signed-in admins; without it, anyone running the app locally. */
export async function canEdit(): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  if (!supabaseEnabled) {
    return process.env.NODE_ENV === "development" || process.env.CURATED_ADMIN_WRITE === "1"
      ? { ok: true }
      : { ok: false, error: "Editing is only available when running locally.", status: 403 };
  }
  const user = await currentUser();
  if (!user) return { ok: false, error: "Log in to edit.", status: 401 };
  if (!(await isAdminUser(user))) return { ok: false, error: "Only admins can edit curated places.", status: 403 };
  return { ok: true };
}
