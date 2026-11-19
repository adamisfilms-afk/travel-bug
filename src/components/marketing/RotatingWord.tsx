"use client";

import { useEffect, useState } from "react";

/**
 * Cycles through words with a short rise-and-fade. With reduced motion turned on, it stays
 * on the first word. Screen readers get the full sentence from the page instead.
 */
export function RotatingWord({ words, interval = 2600, className }: { words: string[]; interval?: number; className?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (words.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % words.length), interval);
    return () => clearInterval(t);
  }, [words.length, interval]);
  return (
    <span aria-hidden className={`inline-block ${className ?? ""}`}>
      <span key={i} className="inline-block animate-[word-in_600ms_cubic-bezier(0.2,0.8,0.2,1)_both]">
        {words[i]}.
      </span>
    </span>
  );
}
