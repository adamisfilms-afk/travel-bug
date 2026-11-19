"use client";

import { MapPin } from "@phosphor-icons/react";
import { Suspense } from "react";
import { CuratedGuidePage } from "@/components/CuratedGuidePage";
import { exploreGuideBySlug, matchExploreGuides } from "@/lib/explore/guides";

export default function ExplorePage() {
  return (
    <Suspense>
      <CuratedGuidePage
        kind="explore"
        title="Explore"
        searchPlaceholder="Search a city for things to do"
        prompt="Search for a city to see our curated sights, museums, shows and things to do."
        findGuide={exploreGuideBySlug}
        match={matchExploreGuides}
        EmptyIcon={MapPin}
      />
    </Suspense>
  );
}
