"use client";

import { Check } from "@phosphor-icons/react";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { PageTitle, SectionTitle } from "@/components/ui";
import { CURRENCIES, currencySymbol } from "@/lib/currency";
import { useSettings } from "@/lib/settingsStore";

export default function SettingsPage() {
  const currency = useSettings((s) => s.currency);
  const setCurrency = useSettings((s) => s.setCurrency);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(t);
  }, [saved]);

  return (
    <div className="space-y-8 max-w-4xl">
      <PageTitle>Settings</PageTitle>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <SectionTitle>Currency</SectionTitle>
          {saved && <span className="text-[13px] text-accent-ink">Saved</span>}
        </div>
        <p className="text-[14px] text-ink-muted max-w-2xl">
          Flight and hotel searches show prices in this currency. Flights and stays you&apos;ve already saved keep the
          currency they were saved in, so their price-change colours stay accurate.
        </p>

        <div role="radiogroup" aria-label="Currency" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {CURRENCIES.map((c) => {
            const selected = c.code === currency;
            return (
              <button
                key={c.code}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  setCurrency(c.code);
                  setSaved(true);
                }}
                className={clsx(
                  "relative flex items-center gap-3 rounded-[10px] bg-surface px-3.5 py-2.5 text-left border transition-colors",
                  selected ? "dashed-accent" : "border-transparent hover:border-line",
                )}
              >
                <span
                  className={clsx(
                    "grid place-items-center size-8 shrink-0 rounded-full bg-white font-semibold",
                    currencySymbol(c.code).length > 2 ? "text-[10px]" : "text-[13px]",
                  )}
                >
                  {currencySymbol(c.code)}
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-medium leading-tight">{c.code}</span>
                  <span className="block text-[12px] text-ink-muted truncate">{c.name}</span>
                </span>
                {selected && <Check weight="bold" className="ml-auto size-4 text-accent-ink shrink-0" />}
              </button>
            );
          })}
        </div>
        <p className="text-[12px] text-ink-muted">
          Live Google Flights results are priced directly in your currency. The demo flights and sample hotels are
          converted from US dollars at approximate rates.
        </p>
      </section>
    </div>
  );
}
