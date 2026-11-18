export interface CurrencyInfo {
  code: string;
  name: string;
}

/** Currencies offered in Settings (all supported by Google Flights / Skyscanner). */
export const CURRENCIES: CurrencyInfo[] = [
  { code: "USD", name: "US dollar" },
  { code: "GBP", name: "British pound" },
  { code: "EUR", name: "Euro" },
  { code: "AUD", name: "Australian dollar" },
  { code: "CAD", name: "Canadian dollar" },
  { code: "NZD", name: "New Zealand dollar" },
  { code: "CHF", name: "Swiss franc" },
  { code: "JPY", name: "Japanese yen" },
  { code: "SGD", name: "Singapore dollar" },
  { code: "HKD", name: "Hong Kong dollar" },
  { code: "AED", name: "UAE dirham" },
  { code: "INR", name: "Indian rupee" },
  { code: "ZAR", name: "South African rand" },
  { code: "SEK", name: "Swedish krona" },
  { code: "NOK", name: "Norwegian krone" },
  { code: "DKK", name: "Danish krone" },
  { code: "HUF", name: "Hungarian forint" },
  { code: "MXN", name: "Mexican peso" },
];

export const DEFAULT_CURRENCY = "USD";

export function isCurrency(code: unknown): code is string {
  return typeof code === "string" && CURRENCIES.some((c) => c.code === code);
}

/**
 * Rough units per 1 USD. Only used to convert the built-in demo data (mock flights and
 * the sample hotel list); live providers return prices in the requested currency.
 */
const APPROX_PER_USD: Record<string, number> = {
  USD: 1, GBP: 0.78, EUR: 0.92, AUD: 1.52, CAD: 1.37, NZD: 1.66, CHF: 0.88, JPY: 150,
  SGD: 1.34, HKD: 7.8, AED: 3.67, INR: 84, ZAR: 18.2, SEK: 10.6, NOK: 10.8, DKK: 6.9,
  HUF: 360, MXN: 18.5,
};

export function fromUsd(amount: number, currency: string) {
  return Math.round(amount * (APPROX_PER_USD[currency] ?? 1));
}

export function currencySymbol(code: string) {
  try {
    return (
      new Intl.NumberFormat("en", { style: "currency", currency: code, currencyDisplay: "narrowSymbol" })
        .formatToParts(0)
        .find((p) => p.type === "currency")?.value ?? code
    );
  } catch {
    return code;
  }
}
