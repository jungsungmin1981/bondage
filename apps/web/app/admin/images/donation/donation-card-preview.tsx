"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import type { Rigger } from "@/lib/rigger-sample";
import { RiggerTierCard } from "@/components/rigger-tier-card";
import { DonationCardForm } from "./donation-card-form";

const DONATION_CARD_PNG = "/donation-card.png";
const DONATION_CARD_GIF = "/donation-card.gif";

const SAMPLE_BRONZE_RIGGER: Rigger = {
  id: "donation-preview-sample",
  name: "브론즈 예시",
  tier: "bronze",
  avatarFallback: "브론",
  markImageUrl: "/marks/dragon-mark.png",
  stars: 5,
};

export function DonationCardPreviewSection() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [savedImageFailed, setSavedImageFailed] = useState(false);
  /** GIF 로드 실패 시 PNG 시도 */
  const [tryPngFallback, setTryPngFallback] = useState(false);

  useEffect(() => {
    if (previewUrl) {
      setSavedImageFailed(false);
      setTryPngFallback(false);
    }
  }, [previewUrl]);

  /** 저장된 이미지: GIF를 먼저 시도해 애니메이션이 보이도록 함 */
  const savedUrl = tryPngFallback ? DONATION_CARD_PNG : DONATION_CARD_GIF;
  const overlayUrl =
    previewUrl ?? (savedImageFailed ? null : savedUrl);

  return (
    <div className="space-y-4">
      <DonationCardForm onPreviewChange={setPreviewUrl} />
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
              {overlayUrl.includes(".gif") || overlayUrl.startsWith("blob:") ? (
                <img
                  src={overlayUrl}
                  alt=""
                  className="absolute inset-0 size-full object-cover object-center"
                onError={() => {
                  if (!previewUrl) {
                    if (!tryPngFallback) setTryPngFallback(true);
                    else setSavedImageFailed(true);
                  } else setPreviewUrl(null);
                  }}
                />
              ) : (
                <Image
                  src={overlayUrl}
                  alt=""
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 640px) 360px, 400px"
                  unoptimized
                  onError={() => {
                    if (!previewUrl) {
                      if (!tryPngFallback) setTryPngFallback(true);
                      else setSavedImageFailed(true);
                    } else setPreviewUrl(null);
                  }}
                />
              )}
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
