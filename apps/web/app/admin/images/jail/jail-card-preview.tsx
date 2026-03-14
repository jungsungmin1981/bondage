"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import type { Rigger } from "@/lib/rigger-sample";
import { RiggerTierCard } from "@/components/rigger-tier-card";
import { JailCardForm } from "./jail-card-form";

const JAIL_CARD_URL = "/jail-card.png";
const BRONZE_CARD_DEFAULT_URL = "/rigger-card-bronze.png";
const DEFAULT_MARK_URL = "/default-rigger-mark.png";

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
  const [jailCardFailed, setJailCardFailed] = useState(false);

  useEffect(() => {
    if (!previewUrl) setJailCardFailed(false);
  }, [previewUrl]);

  const overlayUrl =
    previewUrl ?? (jailCardFailed ? BRONZE_CARD_DEFAULT_URL : JAIL_CARD_URL);

  return (
    <div className="space-y-4">
      <JailCardForm onPreviewChange={setPreviewUrl} />
      <div className="flex justify-start">
        <div className="relative w-full max-w-[360px] aspect-[3/4] overflow-hidden rounded-xl sm:max-w-[400px]">
          <div className="absolute inset-0">
            <RiggerTierCard rigger={SAMPLE_BRONZE_RIGGER} />
          </div>
          {/* 기본 회원 마크 (등급카드와 동일 위치·비율) */}
          <div
            className="pointer-events-none absolute left-1/2 flex justify-center"
            style={{
              top: "41%",
              transform: "translate(-50%, -50%)",
              width: "61%",
              aspectRatio: "1",
            }}
            aria-hidden
          >
            <div
              className="flex h-full w-full overflow-hidden rounded-full bg-black/90 shadow-inner ring-2 ring-amber-800/60"
              style={{
                border: "2px solid rgba(180, 115, 51, 0.95)",
                boxShadow:
                  "inset 0 1px 2px rgba(0,0,0,0.5), 0 0 0 1px rgba(180, 115, 51, 0.4)",
              }}
            >
              <img
                src={DEFAULT_MARK_URL}
                alt=""
                className="h-full w-full object-contain object-center bg-black/90"
              />
            </div>
          </div>
          {/* 등록 이미지: 가장 위쪽 레이어, 1.5배 확대 + 실버 톤 */}
          <div
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl"
            aria-hidden
          >
            <div className="absolute inset-0 origin-center scale-x-[2.06] scale-y-[1.28]">
              <Image
                src={overlayUrl}
                alt=""
                fill
                className="object-fill object-center"
              sizes="(max-width: 640px) 360px, 400px"
              unoptimized={!!previewUrl}
              onError={() => {
                if (!previewUrl && overlayUrl === JAIL_CARD_URL) {
                  setJailCardFailed(true);
                }
              }}
              />
            </div>
            <div
              className="absolute inset-0 bg-slate-400/30 mix-blend-overlay"
              aria-hidden
            />
          </div>
        </div>
      </div>
    </div>
  );
}
