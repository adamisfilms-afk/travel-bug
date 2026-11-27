/* Loading placeholders shaped like the real results, so the page doesn't jump when they arrive. */

const Bar = ({ w, h = 12, className = "" }: { w: number | string; h?: number; className?: string }) => (
  <span className={`skeleton block ${className}`} style={{ width: w, height: h }} />
);

/** Mirrors a flight result row: route, airline, times, date, stops, price and Book. */
export function FlightSkeleton({ i = 0 }: { i?: number }) {
  return (
    <div className="rounded-[10px] bg-surface px-4 py-3.5 flex items-center gap-4" style={{ animationDelay: `${i * 90}ms` }} aria-hidden>
      <Bar w={66} h={14} />
      <span className="skeleton block size-6 !rounded-full shrink-0" />
      <Bar w={44} className="hidden sm:block" />
      <Bar w={92} h={14} />
      <Bar w={72} className="hidden md:block" />
      <Bar w={86} className="hidden md:block" />
      <span className="ml-auto flex items-center gap-3">
        <Bar w={54} h={16} />
        <span className="skeleton block h-8 w-[66px] !rounded-full" />
      </span>
    </div>
  );
}

export function FlightSkeletons({ n = 6 }: { n?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading flights">
      {Array.from({ length: n }, (_, i) => (
        <FlightSkeleton key={i} i={i} />
      ))}
    </div>
  );
}

/** Mirrors a stay card: photo, name, stars, area, rating, tags, then price and buttons. */
export function StaySkeleton() {
  return (
    <div className="rounded-xl bg-surface-strong flex flex-col sm:flex-row overflow-hidden" aria-hidden>
      <span className="skeleton block sm:w-[260px] h-48 sm:h-[190px] shrink-0 !rounded-none" />
      <div className="flex-1 p-4 space-y-2.5">
        <Bar w="62%" h={16} />
        <Bar w={84} h={10} />
        <Bar w="44%" />
        <Bar w="36%" />
        <Bar w="70%" h={10} className="!mt-4" />
      </div>
      <div className="sm:w-[176px] p-4 sm:border-l border-line/60 flex flex-col gap-2.5">
        <Bar w={90} h={20} />
        <Bar w={70} />
        <Bar w={80} />
        <span className="mt-auto flex items-center gap-2 pt-4">
          <span className="skeleton block h-8 flex-1" />
          <span className="skeleton block size-8 !rounded-full" />
        </span>
      </div>
    </div>
  );
}

export function StaySkeletons({ n = 4 }: { n?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading stays">
      {Array.from({ length: n }, (_, i) => (
        <StaySkeleton key={i} />
      ))}
    </div>
  );
}

/** Small reassurance under the skeletons: live searches take a while. */
export function LiveSearchNote({ what }: { what: string }) {
  return <p className="text-[13px] text-ink-muted">Checking live prices for {what} — this usually takes 5–20 seconds.</p>;
}
