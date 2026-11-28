import { NextResponse } from "next/server";
import { MODEL } from "@/lib/assistant/claude";
import type { ChatContent } from "@/lib/assistant/types";
import { currentUser, isAdminUser, supabaseAdmin } from "@/lib/supabase/server";

/**
 * Admin analytics for the trip assistant: GET ?days=30.
 * Reads the assistant_calls log (every AI call: tokens, cost, time, status) and the saved
 * chats (to measure how often answers came from the curated guides). Admins only.
 */

interface Call {
  id: number;
  created_at: string;
  user_id: string | null;
  trip_id: string | null;
  request_id: string | null;
  step: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  cost_usd: number | string;
  duration_ms: number | null;
  status: string;
  error: string | null;
  city: string | null;
  query: string | null;
  curated_count: number | null;
  general_count: number | null;
}

export async function GET(req: Request) {
  const user = await currentUser();
  if (!(await isAdminUser(user))) return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Analytics need SUPABASE_SERVICE_ROLE_KEY on the server." }, { status: 503 });

  const days = Math.min(365, Math.max(1, Number(new URL(req.url).searchParams.get("days")) || 30));
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const [callsRes, msgsRes, usersRes] = await Promise.all([
    admin.from("assistant_calls").select("*").gte("created_at", since).order("created_at", { ascending: false }).limit(10000),
    admin.from("trip_messages").select("role, content, user_id, created_at").gte("created_at", since).limit(20000),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);
  if (callsRes.error) {
    const missing = /assistant_calls|does not exist|schema cache/i.test(callsRes.error.message);
    return NextResponse.json({ error: missing ? "Run supabase/004_assistant.sql in Supabase first." : callsRes.error.message }, { status: 500 });
  }
  const calls = (callsRes.data ?? []) as Call[];
  const messages = (msgsRes.data ?? []) as { role: string; content: ChatContent; user_id: string | null; created_at: string }[];
  const emails = new Map((usersRes.data?.users ?? []).map((u) => [u.id, u.email ?? u.id]));

  const cost = (c: Call) => Number(c.cost_usd) || 0;
  const requests = new Map<string, Call[]>();
  for (const c of calls) {
    const k = c.request_id ?? `call-${c.id}`;
    requests.set(k, [...(requests.get(k) ?? []), c]);
  }
  const totalCost = calls.reduce((n, c) => n + cost(c), 0);

  // Per day
  const byDay = new Map<string, { day: string; requests: number; calls: number; cost: number; errors: number }>();
  for (let d = 0; d < days; d++) {
    const day = new Date(Date.now() - d * 86_400_000).toISOString().slice(0, 10);
    byDay.set(day, { day, requests: 0, calls: 0, cost: 0, errors: 0 });
  }
  for (const [, cs] of requests) {
    const day = cs[cs.length - 1].created_at.slice(0, 10);
    const row = byDay.get(day);
    if (row) row.requests++;
  }
  for (const c of calls) {
    const row = byDay.get(c.created_at.slice(0, 10));
    if (!row) continue;
    row.calls++;
    row.cost += cost(c);
    if (c.status !== "ok") row.errors++;
  }

  // Per user
  const byUser = new Map<string, { user: string; requests: number; cost: number; last: string }>();
  for (const [, cs] of requests) {
    const id = cs[0].user_id ?? "unknown";
    const row = byUser.get(id) ?? { user: emails.get(id) ?? id, requests: 0, cost: 0, last: cs[0].created_at };
    row.requests++;
    row.cost += cs.reduce((n, c) => n + cost(c), 0);
    if (cs[0].created_at > row.last) row.last = cs[0].created_at;
    byUser.set(id, row);
  }

  // Cities asked about
  const cities = new Map<string, number>();
  for (const c of calls) if (c.step === "pick" && c.city) cities.set(c.city, (cities.get(c.city) ?? 0) + 1);

  // Grounding: of the cards shown, how many came from the curated guides
  let curatedCards = 0;
  let generalCards = 0;
  let answersWithCards = 0;
  let fullyCurated = 0;
  for (const m of messages) {
    const cards = m.role === "assistant" ? (m.content?.cards ?? []) : [];
    if (!cards.length) continue;
    answersWithCards++;
    const cur = cards.filter((c) => c.source === "curated").length;
    curatedCards += cur;
    generalCards += cards.length - cur;
    if (cur === cards.length) fullyCurated++;
  }

  const userMessages = messages.filter((m) => m.role === "user");
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const todayByUser = new Map<string, number>();
  for (const m of userMessages) if (m.created_at >= dayAgo && m.user_id) todayByUser.set(m.user_id, (todayByUser.get(m.user_id) ?? 0) + 1);
  const limit = Number(process.env.ASSISTANT_MESSAGES_PER_DAY ?? 10);

  // AI calls only (the log also has "prices" steps: hotel price lookups, which cost no AI tokens)
  const ai = calls.filter((c) => c.step !== "prices");
  const sum = (f: (c: Call) => number) => ai.reduce((n, c) => n + (f(c) || 0), 0);
  const ok = ai.filter((c) => c.status === "ok");

  return NextResponse.json({
    days,
    model: MODEL,
    keySet: Boolean(process.env.ANTHROPIC_API_KEY),
    limit,
    totals: {
      requests: requests.size,
      calls: ai.length,
      cost: totalCost,
      costPerRequest: requests.size ? totalCost / requests.size : 0,
      inputTokens: sum((c) => c.input_tokens),
      outputTokens: sum((c) => c.output_tokens),
      cacheReadTokens: sum((c) => c.cache_read_tokens),
      cacheWriteTokens: sum((c) => c.cache_write_tokens),
      avgMs: ok.length ? Math.round(ok.reduce((n, c) => n + (c.duration_ms ?? 0), 0) / ok.length) : 0,
      errors: ai.filter((c) => c.status === "error").length,
      refusals: ai.filter((c) => c.status === "refused").length,
      users: byUser.size,
      userMessages: userMessages.length,
      usersAtLimitToday: [...todayByUser.values()].filter((n) => n >= limit).length,
    },
    grounding: { answersWithCards, fullyCurated, curatedCards, generalCards },
    byDay: [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day)),
    byUser: [...byUser.values()].sort((a, b) => b.cost - a.cost).slice(0, 20),
    cities: [...cities.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([city, n]) => ({ city, n })),
    log: calls.slice(0, 200).map((c) => ({
      id: c.id,
      at: c.created_at,
      user: c.user_id ? emails.get(c.user_id) ?? c.user_id : "—",
      trip: c.trip_id,
      step: c.step,
      model: c.model,
      input: c.input_tokens,
      output: c.output_tokens,
      cacheRead: c.cache_read_tokens,
      cost: cost(c),
      ms: c.duration_ms,
      status: c.status,
      error: c.error,
      city: c.city,
      query: c.query,
      curated: c.curated_count,
      general: c.general_count,
    })),
  });
}
