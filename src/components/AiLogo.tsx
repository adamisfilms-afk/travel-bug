import clsx from "clsx";

/** The brand's gradient circle — also the trip assistant's logo. */
export const LOGO_GRADIENT = "radial-gradient(circle at 30% 25%, #f7e98b 0%, #c9e3a3 35%, #9fcde0 70%, #e9d6a5 100%)";

/** `thinking`: spins and pops while the assistant is working on a reply. */
export function AiLogo({ className, thinking }: { className?: string; thinking?: boolean }) {
  return <span aria-hidden className={clsx("inline-block shrink-0 rounded-full shadow-sm", thinking && "ai-thinking", className)} style={{ background: LOGO_GRADIENT }} />;
}
