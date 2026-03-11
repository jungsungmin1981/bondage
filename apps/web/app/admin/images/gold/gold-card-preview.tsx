"use client";

import { useState } from "react";
import type { Rigger } from "@/lib/rigger-sample";
import { RiggerTierCard } from "@/components/rigger-tier-card";
import { GoldCardForm } from "./gold-card-form";

const SAMPLE_GOLD_RIGGER: Rigger = {
  id: "gold-sample",
  name: "골드 예시",
  tier: "gold",
  avatarFallback: "골드",
  markImageUrl: "/marks/dragon-mark.png",
  stars: 5,
};

export function GoldCardPreviewSection() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <GoldCardForm onPreviewChange={setPreviewUrl} />
      <div className="flex justify-start">
        <div className="w-full max-w-[360px] sm:max-w-[400px]">
          <RiggerTierCard
            rigger={SAMPLE_GOLD_RIGGER}
            backgroundOverrideUrl={previewUrl ?? undefined}
          />
        </div>
      </div>
    </div>
  );
}

