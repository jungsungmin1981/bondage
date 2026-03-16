"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import type { Rigger } from "@/lib/rigger-sample";
import { RiggerTierCard } from "@/components/rigger-tier-card";
import { JailCardForm } from "./jail-card-form";

const JAIL_CARD_URL = "/jail-card.png";

const SAMPLE_BRONZE_RIGGER: Rigger = {
  id: "jail-preview-sample",
  name: "브론즈 예시",
  tier: "bronze",
  avatarFallback: "브론",
  markImageUrl: "/marks/dragon-mark.png",
  stars: 5,
};

export function JailCardPreviewSection() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [savedImageFailed, setSavedImageFailed] = useState(false);

  useEffect(() => {
    if (previewUrl) setSavedImageFailed(false);
  }, [previewUrl]);

  const overlayUrl =
    previewUrl ?? (savedImageFailed ? null : JAIL_CARD_URL);

  return (
    <div className="space-y-4">
      <JailCardForm onPreviewChange={setPreviewUrl} />
      <div className="flex justify-start">
        <div className="relative w-full min-w-0 max-w-[360px] shrink-0 aspect-[3/4] overflow-hidden rounded-xl sm:max-w-[400px]">
          <div className="absolute inset-0 h-full w-full overflow-hidden rounded-xl">
            <RiggerTierCard rigger={SAMPLE_BRONZE_RIGGER} />
          </div>
          {overlayUrl && (
            <div
              className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl"
              aria-hidden
            >
              <Image
                src={overlayUrl}
                alt=""
                fill
                className="object-cover object-center"
                sizes="(max-width: 640px) 360px, 400px"
                unoptimized
                onError={() => {
                  if (!previewUrl) setSavedImageFailed(true);
                  else setPreviewUrl(null);
                }}
              />
              <div
                className="absolute inset-0 bg-slate-400/20 mix-blend-overlay"
                aria-hidden
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
