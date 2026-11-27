"use client";

import { useRouter } from "next/navigation";
import { TripChips } from "@/components/trips";
import { SectionTitle } from "@/components/ui";

const PLACEHOLDERS = ["bg-ph-mustard", "bg-ph-sky", "bg-ph-sage", "bg-ph-lime", "bg-ph-mustard", "bg-ph-sky"];

function CuratedRow({ title }: { title: string }) {
  return (
    <section className="space-y-5">
      <SectionTitle>{title}</SectionTitle>
      {/* Placeholder cards until curated content is ready */}
      <div className="-mr-5 md:-mr-12 flex gap-5 md:gap-7 overflow-x-auto no-scrollbar pb-2">
        {PLACEHOLDERS.map((c, i) => (
          <div key={i} aria-hidden className={`${c} shrink-0 w-[230px] md:w-[270px] h-[140px] md:h-[162px] rounded-2xl`} />
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  const router = useRouter();
  return (
    <div className="space-y-10">
      <h1 className="font-serif text-[40px] md:text-[54px] leading-[1.12] font-normal">
        Hey Adam,
        <br />
        Let&rsquo;s plan your next adventure.
      </h1>
      <section className="space-y-5">
        <SectionTitle>Upcoming trips</SectionTitle>
        <TripChips onSelect={(id) => router.push(`/trips/${id}`)} />
      </section>
      <CuratedRow title="Curated things to do" />
      <CuratedRow title="Curated stays" />
    </div>
  );
}
