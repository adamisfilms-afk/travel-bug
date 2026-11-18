const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Parse YYYY-MM-DD as a local date (no timezone shift). */
export function parseDay(d: string): Date {
  const [y, m, day] = d.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, day);
}

export function toDay(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function addDays(day: string, n: number): string {
  const d = parseDay(day);
  d.setDate(d.getDate() + n);
  return toDay(d);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / 86_400_000);
}

export function eachDay(start: string, end: string): string[] {
  const out: string[] = [];
  const n = Math.max(0, daysBetween(start, end));
  for (let i = 0; i <= n; i++) out.push(addDays(start, i));
  return out;
}

/** "Wed, 23 December 2026" */
export function longDay(day: string) {
  const d = parseDay(day);
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

/** "23 Dec 2026" */
export function shortDate(day: string) {
  const d = parseDay(day);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "23 Dec" */
export function dayMonth(day: string) {
  const d = parseDay(day);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "23 Dec - 1 Jan 2027" */
export function rangeLabel(start: string, end: string) {
  const s = parseDay(start);
  const e = parseDay(end);
  const left = s.getFullYear() === e.getFullYear() ? dayMonth(start) : shortDate(start);
  return `${left} - ${shortDate(end)}`;
}

/** "07:30" from ISO "2026-12-23T07:30" */
export function hhmm(iso: string) {
  return iso.slice(11, 16);
}

export function money(amount: number, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount)}`;
  }
}

export function durationLabel(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export type PriceTrend = "same" | "up" | "down";

export function priceTrend(saved: number, current: number): PriceTrend {
  if (Math.abs(current - saved) < 0.5) return "same";
  return current > saved ? "up" : "down";
}

export function priceTooltip(kind: "flight" | "stay", saved: number, current: number, currency: string) {
  const t = priceTrend(saved, current);
  const label = kind === "flight" ? "flight" : "stay";
  if (t === "same") return `Price unchanged since you saved this ${label} (${money(saved, currency)}).`;
  return `The ${label} price has ${t === "up" ? "increased" : "decreased"} from ${money(saved, currency)} to ${money(current, currency)} since you saved it.`;
}
