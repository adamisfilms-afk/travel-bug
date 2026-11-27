"use client";

import { Suspense } from "react";
import { CuratedGuidePage } from "@/components/CuratedGuidePage";

export default function CityGuidesPage() {
  return (
    <Suspense>
      <CuratedGuidePage />
    </Suspense>
  );
}
