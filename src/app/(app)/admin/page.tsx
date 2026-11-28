"use client";

import clsx from "clsx";
import { Fragment, useEffect, useState } from "react";
import { PageTitle, SectionTitle } from "@/components/ui";
import { useAccountInfo } from "@/lib/auth";

/** Admin: how the trip assistant is used, what it costs, and a log of every AI call. */

interface Data {
  days: number;
  model: string;
  keySet: boolean;
  limit: number;
  totals: {
    requests: number;
    calls: number;
    cost: number;
    costPerRequest: number;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    avgMs: number;
    errors: number;
    refusals: number;
    users: number;
    userMessages: number;
    usersAtLimitToday: number;
  };
  grounding: { answersWithCards: number; fullyCurated: number; curatedCards: number; generalCards: number };
  byDay: { day: string; requests: number; calls: number; cost: number; errors: number }[];
  byUser: { user: string; requests: number; cost: number; last: string }[];
  cities: { city: string; n: number }[];
  log: {
    id: number;
    at: string;
    user: string;
    trip: string | null;
    step: string;
    model: string;
    input: number;
    output: number;
    cacheRead: number;
    cost: number;
    ms: number | null;
    status: string;
    error: string | null;
    city: string | null;
    query: string | null;
    curated: number | null;
    general: number | null;
  }[];
}

const usd = (n: number) => (n === 0 ? "$0" : n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`);
const num = (n: number) => n.toLocaleString("en-GB");
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function AdminPage() {
  const account = useAccountInfo();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"overview" | "log">("overview");

  useEffect(() => {
    if (!account.isAdmin) return;
    setData(null);
    setError("");
    fetch(`/api/admin/assistant?days=${days}`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error ?? "Couldn't load analytics.");
        setData(d);
      })
      .catch((e) => setError(e.message));
  }, [days, account.isAdmin]);

  if (!account.loaded) return <div className="h-10 w-72 rounded-lg bg-surface animate-pulse" />;
  if (!account.isAdmin) return <p className="text-ink-muted">This page is for admins.</p>;

  return (
    <div className="space-y-8 max-w-6xl">
      <PageTitle
        aside={
          <div className="flex gap-1.5">
            {[1, 7, 30, 90].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={clsx("h-8 px-3 rounded-full text-[13px]", days === d ? "bg-guide-active text-ink" : "bg-surface hover:bg-white")}
              >
                {d === 1 ? "24 h" : `${d} days`}
              </button>
            ))}
          </div>
        }
      >
        Admin
      </PageTitle>

      <div role="tablist" className="flex items-baseline gap-5">
        {(["overview", "log"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={clsx("text-[18px] md:text-[20px]", tab === t ? "text-ink underline decoration-accent decoration-[1.5px] underline-offset-[6px]" : "text-ink-muted hover:text-ink")}
          >
            {t === "overview" ? "Assistant analytics" : "API call log"}
          </button>
        ))}
      </div>

      {error && <p className="rounded-lg bg-price-up/15 text-price-up px-3 py-2 text-[14px]">{error}</p>}
      {!data && !error && <div className="h-40 rounded-xl bg-surface animate-pulse" />}

      {data && (
        <p className="text-[13px] text-ink-muted">
          Model <b className="text-ink font-medium">{data.model}</b> · limit {data.limit} messages per person per day ·{" "}
          {data.keySet ? "API key set" : <span className="text-price-up">ANTHROPIC_API_KEY not set — the assistant is off</span>}
        </p>
      )}

      {data && tab === "overview" && <Overview d={data} />}
      {data && tab === "log" && <Log d={data} />}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-surface px-4 py-3.5">
      <p className="text-[12px] uppercase tracking-wider text-ink-muted">{label}</p>
      <p className="mt-1 font-serif text-[28px] leading-none">{value}</p>
      {sub && <p className="mt-1.5 text-[12px] text-ink-muted">{sub}</p>}
    </div>
  );
}

function Overview({ d }: { d: Data }) {
  const t = d.totals;
  const g = d.grounding;
  const cards = g.curatedCards + g.generalCards;
  return (
    <div className="space-y-10">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Spend" value={usd(t.cost)} sub={`${usd(t.costPerRequest)} per message`} />
        <Stat label="Messages answered" value={num(t.requests)} sub={`${num(t.calls)} AI calls · ${num(t.users)} people`} />
        <Stat label="From curated guides" value={pct(g.curatedCards, cards)} sub={`${num(g.curatedCards)} of ${num(cards)} cards · ${pct(g.fullyCurated, g.answersWithCards)} of answers all-curated`} />
        <Stat label="Avg response" value={t.avgMs ? `${(t.avgMs / 1000).toFixed(1)}s` : "—"} sub={`${t.errors} errors · ${t.refusals} declined`} />
      </div>

      <section className="space-y-3">
        <SectionTitle>Spend per day</SectionTitle>
        <DailyBars rows={d.byDay} />
      </section>

      <div className="grid lg:grid-cols-2 gap-10">
        <section className="space-y-3">
          <SectionTitle>Top users</SectionTitle>
          {d.byUser.length === 0 ? (
            <p className="text-[14px] text-ink-muted">No usage yet.</p>
          ) : (
            <table className="w-full text-[14px]">
              <thead className="text-left text-[12px] uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="py-1.5 font-normal">Person</th>
                  <th className="py-1.5 font-normal text-right">Messages</th>
                  <th className="py-1.5 font-normal text-right">Spend</th>
                  <th className="py-1.5 font-normal text-right hidden sm:table-cell">Last used</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {d.byUser.map((u) => (
                  <tr key={u.user}>
                    <td className="py-2 truncate max-w-[220px]">{u.user}</td>
                    <td className="py-2 text-right tabular-nums">{u.requests}</td>
                    <td className="py-2 text-right tabular-nums">{usd(u.cost)}</td>
                    <td className="py-2 text-right text-ink-muted hidden sm:table-cell">{when(u.last)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="text-[12px] text-ink-muted">{t.usersAtLimitToday} people hit the daily limit in the last 24 hours.</p>
        </section>

        <section className="space-y-3">
          <SectionTitle>Cities asked about</SectionTitle>
          {d.cities.length === 0 ? (
            <p className="text-[14px] text-ink-muted">No searches yet.</p>
          ) : (
            <ul className="divide-y divide-line/70 text-[14px]">
              {d.cities.map((c) => (
                <li key={c.city} className="flex justify-between py-2">
                  <span>{c.city}</span>
                  <span className="tabular-nums text-ink-muted">{c.n}</span>
                </li>
              ))}
            </ul>
          )}
          <SectionTitle className="pt-4">Tokens</SectionTitle>
          <ul className="divide-y divide-line/70 text-[14px]">
            {[
              ["Input", t.inputTokens],
              ["Input from cache", t.cacheReadTokens],
              ["Written to cache", t.cacheWriteTokens],
              ["Output (incl. reasoning)", t.outputTokens],
            ].map(([k, v]) => (
              <li key={k as string} className="flex justify-between py-2">
                <span>{k}</span>
                <span className="tabular-nums text-ink-muted">{num(v as number)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

/** One series (spend per day) as thin bars with a hover readout. */
function DailyBars({ rows }: { rows: Data["byDay"] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...rows.map((r) => r.cost), 0.0001);
  const shown = hover != null ? rows[hover] : null;
  return (
    <div className="space-y-2">
      <p className="text-[13px] text-ink-muted h-5">
        {shown ? (
          <>
            <b className="text-ink font-medium">{new Date(shown.day).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</b> · {usd(shown.cost)} ·{" "}
            {shown.requests} messages{shown.errors ? ` · ${shown.errors} errors` : ""}
          </>
        ) : (
          `Peak ${usd(max === 0.0001 ? 0 : max)} a day`
        )}
      </p>
      <div className="flex items-end gap-[2px] h-32 border-b border-line" onMouseLeave={() => setHover(null)}>
        {rows.map((r, i) => (
          <div key={r.day} className="flex-1 h-full flex items-end cursor-default" onMouseEnter={() => setHover(i)} title={`${r.day}: ${usd(r.cost)}, ${r.requests} messages`}>
            <div
              className={clsx("w-full rounded-t-[4px] transition-colors", hover === i ? "bg-ink" : "bg-ink/60")}
              style={{ height: r.cost ? `${Math.max(3, (r.cost / max) * 100)}%` : 0 }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[11px] text-ink-muted">
        <span>{rows[0] && new Date(rows[0].day).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
        <span>Today</span>
      </div>
    </div>
  );
}

function Log({ d }: { d: Data }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!d.log.length) return <p className="text-[14px] text-ink-muted">No API calls yet.</p>;
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full min-w-[820px] text-[13px]">
        <thead className="text-left text-[11px] uppercase tracking-wider text-ink-muted">
          <tr>
            {["Time", "Person", "Step", "City", "Tokens in / out", "Cache", "Cost", "Time", "Status"].map((h, i) => (
              <th key={i} className={clsx("py-2 px-1 font-normal", i >= 4 && i <= 7 && "text-right")}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line/70">
          {d.log.map((c) => (
            <Fragment key={c.id}>
              <tr onClick={() => setOpen(open === c.id ? null : c.id)} className="cursor-pointer hover:bg-surface/70">
                <td className="py-2 px-1 whitespace-nowrap text-ink-muted">{when(c.at)}</td>
                <td className="py-2 px-1 truncate max-w-[180px]">{c.user}</td>
                <td className="py-2 px-1">{c.step}</td>
                <td className="py-2 px-1">{c.city ?? "—"}</td>
                <td className="py-2 px-1 text-right tabular-nums">
                  {num(c.input)} / {num(c.output)}
                </td>
                <td className="py-2 px-1 text-right tabular-nums text-ink-muted">{num(c.cacheRead)}</td>
                <td className="py-2 px-1 text-right tabular-nums">{usd(c.cost)}</td>
                <td className="py-2 px-1 text-right tabular-nums text-ink-muted">{c.ms != null ? `${(c.ms / 1000).toFixed(1)}s` : "—"}</td>
                <td className="py-2 px-1">
                  <span className={clsx("rounded-full px-2 py-0.5 text-[11px]", c.status === "ok" ? "bg-guide-active/60" : "bg-price-up/15 text-price-up")}>
                    {c.status === "ok" ? "OK" : c.status === "refused" ? "Declined" : "Error"}
                  </span>
                </td>
              </tr>
              {open === c.id && (
                <tr className="bg-surface/60">
                  <td colSpan={9} className="px-3 py-3 text-[13px] space-y-1">
                    {c.query && (
                      <p>
                        <span className="text-ink-muted">Asked:</span> {c.query}
                      </p>
                    )}
                    <p className="text-ink-muted">
                      Model {c.model} · trip {c.trip ?? "—"}
                      {c.curated != null && ` · search found ${c.curated} curated, ${c.general ?? 0} general`}
                    </p>
                    {c.error && <p className="text-price-up">{c.error}</p>}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
