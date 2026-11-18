"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEFAULT_CURRENCY } from "./currency";

interface SettingsState {
  currency: string;
  setCurrency(code: string): void;
}

/** Per-browser preferences (kept in localStorage). */
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      currency: DEFAULT_CURRENCY,
      setCurrency: (currency) => set({ currency }),
    }),
    {
      name: "travel-bug:settings",
      storage: createJSONStorage(() => ({
        getItem: (k) => {
          try {
            return localStorage.getItem(k);
          } catch {
            return null;
          }
        },
        setItem: (k, v) => {
          try {
            localStorage.setItem(k, v);
          } catch {
            /* keep in memory */
          }
        },
        removeItem: (k) => {
          try {
            localStorage.removeItem(k);
          } catch {
            /* ignore */
          }
        },
      })),
      partialize: (s) => ({ currency: s.currency }),
      skipHydration: true, // rehydrated on mount by StoreProvider to avoid SSR mismatches
    },
  ),
);
