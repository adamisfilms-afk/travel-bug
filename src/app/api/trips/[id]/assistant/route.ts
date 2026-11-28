import { randomUUID } from "node:crypto";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { AssistantRefusal, assistantEnabled, pick, toSearchQuery, understand, type CallLog } from "@/lib/assistant/claude";
import { MIN_CURATED, addGoogleFacts, candidatesFromCards, searchCurated, searchGeneral, type Candidate } from "@/lib/assistant/search";
import type { AssistantCard, AssistantReply, ChatContent, ChatMessage } from "@/lib/assistant/types";
import { isAdminUser, supabaseServer } from "@/lib/supabase/server";

/**
 * The trip assistant's chat, saved with the trip (everyone on the trip sees it).
 *
 * GET     → the chat so far, and how many messages you have left today.
 * POST    { text } → sends a message; replies with your message and the assistant's.
 * DELETE  → clears the chat.
 *
 * Each person can send ASSISTANT_MESSAGES_PER_DAY messages (default 10) in any 24 hours;
 * admins aren't limited.
 */

export const maxDuration = 60;

const LIMIT = Number(process.env.ASSISTANT_MESSAGES_PER_DAY ?? 10);
const MAX_CARDS = 5;
const HISTORY = 12;

/** Words that mean someone is asking for places (so it should always be a search). */
const WANTS_PLACES = /\b(hotels?|stay|stays|staying|accommodation|apartments?|hostels?|airbnb|restaurants?|eat|eating|food|dinner|lunch|breakfast|brunch|caf[eé]s?|coffee|bars?|drinks?|pubs?|things to do|see|visit|museums?|sights?|galler(y|ies)|shops?|shopping|recommend\w*|suggest\w*|where)\b/i;

type Ctx = { params: Promise<{ id: string }> };

async function session(ctx: Ctx) {
  const { id } = await ctx.params;
  const sb = await supabaseServer();
  if (!sb) return { error: NextResponse.json({ error: "The assistant needs accounts switched on." }, { status: 400 }) };
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Log in to use the assistant." }, { status: 401 }) };
  // Row-level security: only finds the trip if you're on it
  const { data: trip } = await sb.from("trips").select("id, name, destination, locations, start_date, end_date, travellers").eq("id", id).maybeSingle();
  if (!trip) return { error: NextResponse.json({ error: "Trip not found (it may still be saving — try again in a moment)." }, { status: 404 }) };
  return { sb, user, trip, id };
}

async function remaining(sb: SupabaseClient, user: User): Promise<number | null> {
  if (await isAdminUser(user)) return null;
  const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const { count } = await sb.from("trip_messages").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("role", "user").gte("created_at", since);
  return Math.max(0, LIMIT - (count ?? 0));
}

function friendly(msg: string) {
  if (/trip_messages|relation .* does not exist|schema cache/i.test(msg)) return "The assistant isn't set up in the database yet — run supabase/004_assistant.sql in Supabase.";
  return msg;
}

export async function GET(_req: Request, ctx: Ctx) {
  const s = await session(ctx);
  if ("error" in s) return s.error;
  const { data, error } = await s.sb.from("trip_messages").select("id, role, content, created_at, user_id").eq("trip_id", s.id).order("created_at").limit(200);
  if (error) return NextResponse.json({ error: friendly(error.message) }, { status: 500 });
  const body: AssistantReply = { messages: (data ?? []) as ChatMessage[], remaining: await remaining(s.sb, s.user), limit: LIMIT };
  return NextResponse.json({ ...body, enabled: assistantEnabled() });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const s = await session(ctx);
  if ("error" in s) return s.error;
  const { error } = await s.sb.from("trip_messages").delete().eq("trip_id", s.id);
  if (error) return NextResponse.json({ error: friendly(error.message) }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request, ctx: Ctx) {
  const s = await session(ctx);
  if ("error" in s) return s.error;
  const { sb, user, trip, id } = s;
  if (!assistantEnabled()) return NextResponse.json({ error: "The assistant isn't switched on yet (ANTHROPIC_API_KEY is missing)." }, { status: 503 });

  const body = await req.json().catch(() => null);
  const text = String(body?.text ?? "").trim().slice(0, 500);
  if (!text) return NextResponse.json({ error: "Type a message." }, { status: 400 });

  const left = await remaining(sb, user);
  if (left === 0)
    return NextResponse.json({ error: `You've used your ${LIMIT} assistant messages for today — more tomorrow.`, remaining: 0, limit: LIMIT }, { status: 429 });

  const { data: mine, error: insertError } = await sb.from("trip_messages").insert({ trip_id: id, user_id: user.id, role: "user", content: { text } }).select("id, role, content, created_at, user_id").single();
  if (insertError) return NextResponse.json({ error: friendly(insertError.message) }, { status: 500 });

  const { data: recent } = await sb.from("trip_messages").select("id, role, content, created_at").eq("trip_id", id).order("created_at", { ascending: false }).limit(HISTORY);
  const history = ((recent ?? []) as ChatMessage[]).reverse();

  const log: CallLog = { userId: user.id, tripId: id, requestId: randomUUID() };
  const cities = (trip.locations?.length ? trip.locations : [trip.destination]) as string[];
  let content: ChatContent;
  try {
    content = await reply(history, { name: trip.name, cities, startDate: trip.start_date, endDate: trip.end_date, travellers: trip.travellers }, log);
  } catch (e) {
    console.error("[assistant]", e);
    content =
      e instanceof AssistantRefusal
        ? { text: "Sorry — I can't help with that one. Ask me about places to eat, stay or see." }
        : { text: "Something went wrong on my side — try asking again." };
  }

  const { data: theirs } = await sb.from("trip_messages").insert({ trip_id: id, user_id: user.id, role: "assistant", content }).select("id, role, content, created_at, user_id").single();
  const out: AssistantReply = {
    messages: [mine as ChatMessage, (theirs ?? { id: `tmp-${Date.now()}`, role: "assistant", content, created_at: new Date().toISOString() }) as ChatMessage],
    remaining: left == null ? null : left - 1,
    limit: LIMIT,
  };
  return NextResponse.json(out);
}

/** Understand → (clarify | answer | search curated → maybe general → pick). */
async function reply(history: ChatMessage[], trip: Parameters<typeof understand>[1], log: CallLog): Promise<ChatContent> {
  const u = await understand(history, trip, log);
  if (u.action === "clarify" && u.options.length) return { text: u.message, options: u.options };
  // Safety net: a request for places is always searched, even if the model chose to reply in words
  if (u.action === "answer" && WANTS_PLACES.test(history.at(-1)?.content.text ?? "")) u.action = "search";
  if (u.action !== "search") return { text: u.message || "What are you looking for — somewhere to eat, stay or see?" };

  const q = toSearchQuery(u);
  const previous = history.findLast((m) => m.role === "assistant" && m.content.cards?.length)?.content.cards ?? [];

  // What they asked for, in their words since the last set of results
  const lastResults = history.findLastIndex((m) => m.role === "assistant" && m.content.cards?.length);
  // (follow-ups about shown places also get the original request, for context)
  const request = (u.about_previous ? history.filter((m) => m.role === "user").slice(-4) : history.slice(lastResults + 1).filter((m) => m.role === "user"))
    .map((m) => m.content.text)
    .join(" · ");

  let candidates: Candidate[];
  let curatedCount = 0;
  let generalCount = 0;
  let fixedIntro: string | null = null;
  if (u.about_previous && previous.length) {
    // "Which is best?": judge the places already shown
    candidates = await candidatesFromCards(previous);
  } else {
    // 1. Curated guides first, always
    const { guide, results: curated } = await searchCurated(q);
    // 2. General suggestions when the guides are thin (or there's no guide for this city)
    const general = curated.length < MIN_CURATED ? await searchGeneral(q, MAX_CARDS + 2 - curated.length) : [];
    candidates = [...curated, ...general];
    curatedCount = curated.length;
    generalCount = general.length;
    if (!candidates.length)
      return {
        text: guide
          ? `Nothing in our ${guide.city} guide matches that yet — try a different area or budget.`
          : `We don't have a ${q.city} guide yet, and I couldn't find suggestions right now — try again shortly.`,
      };
    if (!curated.length)
      fixedIntro = guide
        ? `Our ${guide.city} guide doesn't cover this yet, but here are some recommendations I found elsewhere:`
        : `We don't have curated picks for ${q.city} yet, but here are some recommendations I found elsewhere:`;
  }
  // Google rating, reviews and price for curated places (cached), so it can judge which is best
  await addGoogleFacts(candidates);

  const note = u.about_previous ? "\n(They're asking about the places already shown — judge those.)" : "";
  const picks = await pick(`${request}${note}\n(Search: ${JSON.stringify(q)})`, candidates, { ...log, city: q.city, query: request, curated: curatedCount, general: generalCount });
  if (fixedIntro && picks.cards.length) picks.intro = fixedIntro;

  // 3. Only places the search actually returned; details from our data, not the model
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const seen = new Set<string>();
  const cards: AssistantCard[] = [];
  for (const p of picks.cards) {
    const c = byId.get(p.id);
    if (!c || seen.has(c.id)) continue;
    seen.add(c.id);
    cards.push({
      id: c.id,
      source: c.source,
      name: c.name,
      tagline: c.tagline,
      area: c.area,
      price: c.price,
      summary: p.summary.trim().slice(0, 280),
      lat: c.lat,
      lng: c.lng,
      category: c.category,
      guide: c.guide,
      mapsQuery: c.mapsQuery,
      rating: c.rating ?? null,
      reviews: c.reviews ?? null,
    });
  }
  // The model's order stands (best first); curated places are preferred inside the prompt
  const shown = cards.slice(0, MAX_CARDS);
  if (!shown.length) return { text: picks.intro || "None of those quite fit — try a different area or budget." };
  return { text: picks.intro, cards: shown };
}
