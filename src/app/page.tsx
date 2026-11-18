"use client";

import { useRouter } from "next/navigation";
import { TripChips } from "@/components/trips";
import { SectionTitle } from "@/components/ui";

const PLACEHOLDERS = ["bg-ph-mustard", "bg-ph-sky", "bg-ph-sage", "bg-ph-lime", "bg-ph-mustard", "bg-ph-sky"];

function CuratedRow({ title }: { title: string }) {
  return (
    <section className="space-y-8">
      <SectionTitle>{title}</SectionTitle>
      {/* Placeholder cards until curated content is ready */}
      <div className="-mr-5 md:-mr-14 flex gap-6 md:gap-9 overflow-x-auto no-scrollbar pb-2">
        {PLACEHOLDERS.map((c, i) => (
          <div key={i} aria-hidden className={`${c} shrink-0 w-[260px] md:w-[325px] h-[160px] md:h-[195px] rounded-2xl`} />
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  const router = useRouter();
  return (
    <div className="space-y-14">
      <h1 className="text-4xl md:text-[56px] leading-[1.3] font-extrabold tracking-tight">
        Hey Adam,
        <br />
        Let&rsquo;s plan your next adventure.
      </h1>
      <section className="space-y-8">
        <SectionTitle>Upcoming trips</SectionTitle>
        <TripChips onSelect={(id) => router.push(`/trips?trip=${id}`)} />
      </section>
      <CuratedRow title="Curated things to do" />
      <CuratedRow title="Curated stays" />
    </div>
  );
}
