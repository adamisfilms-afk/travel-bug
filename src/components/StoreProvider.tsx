"use client";

import { useEffect } from "react";
import { useSearchStore } from "@/lib/searchStore";
import { useStore } from "@/lib/store";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const init = useStore((s) => s.init);
  const loadError = useStore((s) => s.loadError);
  useEffect(() => {
    void init();
    void useSearchStore.persist.rehydrate();
  }, [init]);
  return (
    <>
      {loadError && (
        <div className="fixed top-0 inset-x-0 z-50 bg-price-up text-white text-sm px-4 py-2 text-center">
          Couldn&apos;t load your trips from Supabase: {loadError}
        </div>
      )}
      {children}
    </>
  );
}
