import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";

export const OVERRIDES_FILE = path.join(process.cwd(), "data", "curated-overrides.json");
export const UPLOADS_DIR = path.join(process.cwd(), "public", "curated", "uploads");

/** Edits are written to files in the project, so they're only allowed when running locally. */
export const CAN_WRITE = process.env.NODE_ENV === "development" || process.env.CURATED_ADMIN_WRITE === "1";

export async function readOverrides(): Promise<Record<string, unknown>> {
  try {
    return JSON.parse(await fs.readFile(OVERRIDES_FILE, "utf8"));
  } catch {
    return {};
  }
}
