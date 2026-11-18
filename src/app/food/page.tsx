"use client";

import { ForkKnife } from "@phosphor-icons/react";
import { Suspense } from "react";
import { CuratedGuidePage } from "@/components/CuratedGuidePage";
import { guideBySlug, matchGuides } from "@/lib/food/guides";

export default function FoodPage() {
  return (
    <Suspense>
      <CuratedGuidePage
        kind="food"
        title="Food"
        searchPlaceholder="Search a city for food guides"
        prompt="Search for a city to see our curated places to eat and drink."
        findGuide={guideBySlug}
        match={matchGuides}
        EmptyIcon={ForkKnife}
      />
    </Suspense>
  );
}
