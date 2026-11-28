import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Candidate, PlaceKind, SearchQuery } from "./search";
import type { ChatMessage } from "./types";

/**
 * The trip assistant's two calls to Claude. Both return JSON that must match a schema
 * (structured outputs), so the model can't skip a step or reply in free text:
 *
 * 1. understand: reads the chat and either asks one short clarifying question, answers briefly,
 *    or turns the request into a search query. The search itself is plain code (search.ts).
 * 2. pick: chooses up to 6 places from the candidates the search returned and writes a
 *    1–2 sentence summary for each. Names, photos and details come from our data, not the model.
 *
 * Every call is logged to assistant_calls (tokens, cost, time) for the admin page.
 */

export const MODEL = process.env.ASSISTANT_MODEL || "claude-sonnet-5-5";

/** US$ per million tokens: input, output, cache read, cache write. */
const PRICES: Record<string, [number, number, number, number]> = {
  "claude-sonnet-5-5": [2, 10, 0.1, 2.5],
  "claude-sonnet-5": [2, 10, 0.2, 2.5],
  "claude-opus-5-5": [4, 20, 0.2, 5],
  "claude-opus-5": [5, 25, 0.5, 6.25],
  "claude-opus-4-8": [5, 25, 0.5, 6.25],
  "claude-haiku-5-5": [0.1, 0.5, 0.01, 0.125],
};

export function costOf(model: string, u: { input: number; output: number; cacheRead: number; cacheWrite: number }) {
  const [i, o, r, w] = PRICES[model] ?? PRICES["claude-sonnet-5-5"];
  return (u.input * i + u.output * o + u.cacheRead * r + u.cacheWrite * w) / 1_000_000;
}

let client: Anthropic | null = null;
export const assistantEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY);
function anthropic() {
  return (client ??= new Anthropic());
}

export class AssistantRefusal extends Error {}

export interface CallLog {
  userId: string;
  tripId: string;
  requestId: string;
  city?: string | null;
  query?: string | null;
  curated?: number | null;
  general?: number | null;
}

/** One structured-output call: returns the parsed JSON and logs usage and cost. */
async function callJSON<T>(step: "understand" | "pick", system: string, messages: Anthropic.Beta.BetaMessageParam[], schema: Record<string, unknown>, log: CallLog): Promise<T> {
  const started = Date.now();
  let row: Record<string, unknown> = { step, model: MODEL, status: "error" };
  try {
    const res = await anthropic().beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      // If a safety check declines a request, Anthropic re-runs it on its recommended fallback model
      fallbacks: "default",
      // Chat replies: keep thinking short (cheaper and faster)
      output_config: { effort: "low", format: { type: "json_schema", schema } },
      cache_control: { type: "ephemeral" },
      system,
      messages,
    });
    const u = res.usage;
    const usage = { input: u.input_tokens ?? 0, output: u.output_tokens ?? 0, cacheRead: u.cache_read_input_tokens ?? 0, cacheWrite: u.cache_creation_input_tokens ?? 0 };
    row = {
      step,
      model: res.model,
      input_tokens: usage.input,
      output_tokens: usage.output,
      cache_read_tokens: usage.cacheRead,
      cache_write_tokens: usage.cacheWrite,
      cost_usd: Number(costOf(res.model, usage).toFixed(6)),
      status: "ok",
    };
    if (res.stop_reason === "refusal") {
      row.status = "refused";
      throw new AssistantRefusal("Declined");
    }
    if (res.stop_reason === "max_tokens") throw new Error("Reply was cut off (max_tokens)");
    const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    return JSON.parse(text) as T;
  } catch (e) {
    if (row.status === "ok") row.status = "error";
    row.error = e instanceof Error ? e.message.slice(0, 500) : String(e);
    throw e;
  } finally {
    await writeLog({ ...row, duration_ms: Date.now() - started }, log);
  }
}

async function writeLog(row: Record<string, unknown>, log: CallLog) {
  const full = {
    ...row,
    user_id: log.userId,
    trip_id: log.tripId,
    request_id: log.requestId,
    city: log.city ?? null,
    query: log.query?.slice(0, 300) ?? null,
    curated_count: log.curated ?? null,
    general_count: log.general ?? null,
  };
  const admin = supabaseAdmin();
  if (!admin) return console.log("[assistant]", JSON.stringify(full));
  const { error } = await admin.from("assistant_calls").insert(full);
  if (error) console.error("[assistant] log failed:", error.message);
}

// ---------------------------------------------------------------------------
// Step 1: understand the request
// ---------------------------------------------------------------------------

export interface Understanding {
  action: "clarify" | "search" | "answer";
  /** The person is asking about places already shown ("which is best?", "tell me more about these"). */
  about_previous: boolean;
  message: string;
  options: string[];
  query: { city: string; kind: PlaceKind | "any"; area: string | null; max_price: number | null; tags: string[]; keywords: string[] };
}

const nullable = (t: string) => ({ anyOf: [{ type: t }, { type: "null" }] });

const UNDERSTAND_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["action", "about_previous", "message", "options", "query"],
  properties: {
    action: { type: "string", enum: ["clarify", "search", "answer"] },
    about_previous: { type: "boolean" },
    message: { type: "string" },
    options: { type: "array", items: { type: "string" } },
    query: {
      type: "object",
      additionalProperties: false,
      required: ["city", "kind", "area", "max_price", "tags", "keywords"],
      properties: {
        city: { type: "string" },
        kind: { type: "string", enum: ["food", "stay", "explore", "any"] },
        area: nullable("string"),
        max_price: nullable("integer"),
        tags: { type: "array", items: { type: "string" } },
        keywords: { type: "array", items: { type: "string" } },
      },
    },
  },
};

const UNDERSTAND_SYSTEM = `You are the trip assistant inside "wheretonext", a travel planner built around hand-picked City Guides. You help someone find places for the trip they're planning: restaurants, cafés and bars (kind "food"), hotels and apartments ("stay"), and sights, museums, shops and things to do ("explore").

Read the conversation and choose one action.

"clarify": ask ONE short question when the answer would clearly change which places to suggest (for example the area to stay in, budget, or what kind of food). Rules:
- At most two clarifying questions in the whole conversation. If you have already asked two, or the person said "no preference" or gave enough detail, search instead.
- Never ask about something they already told you, or about the city when the trip has one.
- Never ask what they mean by "best", "good" or "worth it" — they want your judgement, so search and give it.
- Don't ask when they're asking about places you've just shown.
- message: the question, 12 words or fewer.
- options: 2 to 4 short answers (3 words or fewer each), with "No preference" last.

"search": find places. Fill query:
- city: the city they mean. Default to the trip's main destination; use another trip city or a city they name if that's what they asked about.
- kind: food, stay, explore, or any.
- area: a neighbourhood or district they want, otherwise null.
- max_price: 1 (cheap) to 4 (luxury) if they gave a budget, otherwise null.
- tags: any that apply from: kids, family, romantic, budget, luxury, vegetarian, vegan, late-night, outdoors, rainy-day, views, quiet, lively, local, classic, design.
- keywords: specific things they want, e.g. "schnitzel", "rooftop", "natural wine", "pool". Short words, no filler.
- about_previous: true when they're asking about places already shown ("which is the best?", "which is cheapest?", "tell me more about these"), so you should judge those same places rather than search again. Otherwise false.
- message: an empty string. options: [].

"answer": for anything that isn't finding places (a quick fact, a thank-you). message: at most two short sentences, then offer to find places. options: []. about_previous: false. Fill query with the trip's city, kind "any", nulls and empty lists.

For "clarify", about_previous is false.

Use British spelling. Keep everything brief.`;

/** The chat as the model sees it: our earlier replies are summarised to keep it short. */
function transcript(history: ChatMessage[]): Anthropic.Beta.BetaMessageParam[] {
  const out: Anthropic.Beta.BetaMessageParam[] = [];
  for (const m of history) {
    const c = m.content;
    let text = c.text;
    if (m.role === "assistant") {
      if (c.options?.length) text = `${c.text} [options: ${c.options.join(" / ")}]`;
      if (c.cards?.length) text = `${c.text} [showed: ${c.cards.map((x) => x.name).join(", ")}]`;
    }
    if (!text.trim()) continue;
    if (!out.length && m.role === "assistant") continue; // must start with the person
    out.push({ role: m.role, content: text });
  }
  return out;
}

export interface TripContext {
  name: string;
  cities: string[];
  startDate: string;
  endDate: string;
  travellers: number;
}

const tripLine = (t: TripContext, curatedCities: string[]) =>
  `Trip: "${t.name}" — ${t.cities.join(", ") || "no city yet"}, ${t.startDate} to ${t.endDate}, ${t.travellers} traveller${t.travellers === 1 ? "" : "s"}. Cities with curated guides: ${curatedCities.join(", ")}.`;

export async function understand(history: ChatMessage[], trip: TripContext, curatedCities: string[], log: CallLog): Promise<Understanding> {
  const msgs = transcript(history);
  const last = msgs[msgs.length - 1];
  if (!last || last.role !== "user") throw new Error("The conversation must end with a message from the person.");
  // Trip details go with the latest message (they can change), so the instructions above stay cacheable
  last.content = `${tripLine(trip, curatedCities)}\n\n${last.content as string}`;
  const r = await callJSON<Understanding>("understand", UNDERSTAND_SYSTEM, msgs, UNDERSTAND_SCHEMA, { ...log, query: history.at(-1)?.content.text });
  // Belt and braces on top of the schema
  r.options = (r.options ?? []).map((o) => o.trim()).filter(Boolean).slice(0, 4);
  r.query.tags = (r.query.tags ?? []).slice(0, 6);
  r.query.keywords = (r.query.keywords ?? []).slice(0, 6);
  if (r.query.max_price != null) r.query.max_price = Math.min(4, Math.max(1, Math.round(r.query.max_price)));
  return r;
}

export const toSearchQuery = (u: Understanding): SearchQuery => ({
  city: u.query.city,
  kind: u.query.kind,
  area: u.query.area,
  maxPrice: u.query.max_price,
  tags: u.query.tags,
  keywords: u.query.keywords,
});

// ---------------------------------------------------------------------------
// Step 2: pick places from the search results
// ---------------------------------------------------------------------------

export interface Picks {
  intro: string;
  cards: { id: string; summary: string }[];
}

const PICK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["intro", "cards"],
  properties: {
    intro: { type: "string" },
    cards: {
      type: "array",
      items: { type: "object", additionalProperties: false, required: ["id", "summary"], properties: { id: { type: "string" }, summary: { type: "string" } } },
    },
  },
};

const PICK_SYSTEM = `You are the trip assistant inside "wheretonext", a travel planner built around hand-picked City Guides. You are given what someone asked for and a list of candidate places. Choose the places to show them and say a little about each.

Rules:
- Only use ids from the candidate list. Never suggest a place that isn't in it.
- Candidates with source "curated" are our editors' picks; "general" ones were found elsewhere. When places fit equally well, prefer curated ones. But judge on merit: if they ask for the best, the cheapest, or something specific, pick and order the places that genuinely fit best.
- Show 4 or 5 places when that many fit (fewer only if fewer fit), best first.
- When they ask which is best (or cheapest, quietest…), give a clear answer: order by your judgement and make the intro a one-line verdict naming your top pick and why, e.g. "Hotel Motto edges it — 4.7 on Google from 2,000 reviews and the best location.". Use the Google rating and review count, price, area and what you know about each place.
- summary: 1–2 sentences, 30 words or fewer, saying why it suits this request. Use the candidate's details (about, tagline, area, rating, reviews, price). You may add what is widely known about a well-known place, but never state specific facts (prices, awards, amenities, opening hours) you're not sure of. Mention the Google rating when it helps the comparison.
- intro: one short line, 15 words or fewer. If nothing fits, say so briefly, suggest what to try instead, and return no cards.
- British spelling. No emoji.`;

export async function pick(request: string, candidates: Candidate[], log: CallLog): Promise<Picks> {
  const list = candidates.map((c) => ({
    id: c.id,
    source: c.source,
    name: c.name,
    tagline: c.tagline,
    section: c.section,
    area: c.area,
    price: c.price,
    google_rating: c.rating ?? null,
    google_reviews: c.reviews ?? null,
    about: c.about,
  }));
  const content = `Request: ${request}\n\nCandidates (JSON):\n${JSON.stringify(list)}`;
  const r = await callJSON<Picks>("pick", PICK_SYSTEM, [{ role: "user", content }], PICK_SCHEMA, log);
  return { intro: (r.intro ?? "").trim(), cards: (r.cards ?? []).filter((c) => c && typeof c.id === "string") };
}
