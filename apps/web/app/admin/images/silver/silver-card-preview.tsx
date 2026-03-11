"use client";

import { useState } from "react";
import type { Rigger } from "@/lib/rigger-sample";
import { RiggerTierCard } from "@/components/rigger-tier-card";
import { SilverCardForm } from "./silver-card-form";

const SAMPLE_SILVER_RIGGER: Rigger = {
  id: "silver-sample",
  name: "실버 예시",
  tier: "silver",
  avatarFallback: "실버",
  markImageUrl: "/marks/dragon-mark.png",
  stars: 5,
};

export function SilverCardPreviewSection() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <SilverCardForm onPreviewChange={setPreviewUrl} />
      <div className="flex justify-start">
        <div className="w-full max-w-[360px] sm:max-w-[400px]">
          <RiggerTierCard
            rigger={SAMPLE_SILVER_RIGGER}
            backgroundOverrideUrl={previewUrl ?? undefined}
          />
        </div>
      </div>
    </div>
  );
}

