"use client";

import { useState } from "react";
import type { Rigger } from "@/lib/rigger-sample";
import { RiggerTierCard } from "@/components/rigger-tier-card";
import { MasterCardForm } from "./master-card-form";

const SAMPLE_LEGEND_RIGGER: Rigger = {
  id: "legend-sample",
  name: "마스터 예시",
  tier: "legend",
  avatarFallback: "마스터",
  markImageUrl: "/marks/dragon-mark.png",
  stars: 5,
};

export function MasterCardPreviewSection() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <MasterCardForm onPreviewChange={setPreviewUrl} />
      <div className="flex justify-start">
        <div className="w-full max-w-[360px] sm:max-w-[400px]">
          <RiggerTierCard
            rigger={SAMPLE_LEGEND_RIGGER}
            backgroundOverrideUrl={previewUrl ?? undefined}
          />
        </div>
      </div>
    </div>
  );
}

