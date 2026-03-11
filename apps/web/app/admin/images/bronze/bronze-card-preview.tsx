"use client";

import { useState } from "react";
import type { Rigger } from "@/lib/rigger-sample";
import { RiggerTierCard } from "@/components/rigger-tier-card";
import { BronzeCardForm } from "./bronze-card-form";

const SAMPLE_BRONZE_RIGGER: Rigger = {
  id: "bronze-sample",
  name: "브론즈 예시",
  tier: "bronze",
  avatarFallback: "브론",
  markImageUrl: "/marks/dragon-mark.png",
  stars: 5,
};

export function BronzeCardPreviewSection() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <BronzeCardForm onPreviewChange={setPreviewUrl} />
      <div className="flex justify-start">
        <div className="w-full max-w-[360px] sm:max-w-[400px]">
          <RiggerTierCard
            rigger={SAMPLE_BRONZE_RIGGER}
            backgroundOverrideUrl={previewUrl ?? undefined}
          />
        </div>
      </div>
    </div>
  );
}

