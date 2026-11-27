"use client";

import { useEffect } from "react";
import { useSearchStore } from "@/lib/searchStore";
import { useShareSync } from "@/lib/share";
import { useSettings } from "@/lib/settingsStore";
import { useStore } from "@/lib/store";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const init = useStore((s) => s.init);
  const loadError = useStore((s) => s.loadError);
  const saveError = useStore((s) => s.saveError);
  useShareSync();
  useEffect(() => {
    void init();
    void useSearchStore.persist.rehydrate();
    void useSettings.persist.rehydrate();
  }, [init]);
  return (
    <>
      {saveError && (
        <div role="alert" className="fixed top-0 inset-x-0 z-50 bg-price-up text-white text-sm px-4 py-2 text-center">
          A change couldn&apos;t be saved to your account ({saveError}). Refresh to see what&apos;s saved.{" "}
          <button type="button" onClick={() => useStore.setState({ saveError: null })} className="underline underline-offset-2 ml-2">
            Dismiss
          </button>
        </div>
      )}
      {loadError && (
        <div className="fixed top-0 inset-x-0 z-50 bg-price-up text-white text-sm px-4 py-2 text-center">
          Couldn&apos;t load your trips from Supabase: {loadError}
        </div>
      )}
      {children}
    </>
  );
}
