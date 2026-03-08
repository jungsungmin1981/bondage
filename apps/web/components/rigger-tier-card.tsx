"use client";

import { Star } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import type { Rigger, RiggerTier } from "@/lib/rigger-sample";
import { TIER_STARS } from "@/lib/rigger-sample";

const TIER_STYLES: Record<
  RiggerTier,
  { border: string; glow: string; banner: string; star: string }
> = {
  legend: {
    border: "border-purple-500/80 ring-purple-500/30",
    glow: "shadow-lg shadow-purple-500/20",
    banner: "bg-purple-900/90 border-purple-500/50 text-white",
    star: "text-purple-400 fill-purple-400",
  },
  gold: {
    border: "border-amber-500/80 ring-amber-500/30",
    glow: "shadow-lg shadow-amber-500/20",
    banner: "bg-amber-900/90 border-amber-500/50 text-white",
    star: "text-amber-400 fill-amber-400",
  },
  silver: {
    border: "border-slate-400/80 ring-slate-400/30",
    glow: "shadow-lg shadow-slate-400/20",
    banner: "bg-slate-700/90 border-slate-400/50 text-white",
    star: "text-slate-300 fill-slate-300",
  },
  bronze: {
    border: "border-amber-700/80 ring-amber-700/30",
    glow: "shadow-lg shadow-amber-800/20",
    banner: "bg-amber-900/80 border-amber-700/50 text-white",
    star: "text-amber-600 fill-amber-600",
  },
};

/** 레전드 카드 이미지 배경: 원형 마크·닉네임만 표시 (별 없음), 레전드(퍼플) 테마 */
function LegendCardWithImage({ rigger }: { rigger: Rigger }) {
  return (
    <article
      className="@container relative flex w-full min-w-0 flex-col overflow-hidden rounded-xl border-2 border-purple-500/80 shadow-lg shadow-purple-500/20 ring-2 ring-purple-500/30"
      style={{
        backgroundImage: "url(/rigger-card-legend.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      aria-label={`${rigger.name}, 레전드 등급`}
    >
      <div className="relative aspect-[3/4] min-h-[190px] w-full min-w-0 pb-12 py-3 sm:min-h-[210px] sm:pb-14 sm:py-4">
        {/* 1. 원형 링: 마크 */}
        <div
          className="absolute left-0 right-0 flex justify-center"
          style={{ top: "41%", transform: "translateY(-50%)" }}
        >
          <div
            className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-black/90 shadow-inner ring-2 ring-purple-500/60"
            style={{
              width: "61cqw",
              aspectRatio: "1",
              borderWidth: "max(2px, 0.5cqw)",
              borderStyle: "solid",
              borderColor: "rgba(168, 85, 247, 0.95)",
              boxShadow: "inset 0 1px 2px rgba(0,0,0,0.5), 0 0 0 1px rgba(168, 85, 247, 0.4)",
            }}
          >
            <div className="absolute inset-0 overflow-hidden rounded-full">
              {rigger.markImageUrl ? (
                <img
                  src={rigger.markImageUrl}
                  alt=""
                  className="h-full w-full object-cover object-center"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Avatar className="h-[70%] w-[70%]" size="lg">
                    <AvatarImage src={rigger.avatarUrl ?? undefined} alt="" />
                    <AvatarFallback className="text-base font-medium text-purple-200/90 sm:text-lg">
                      {rigger.avatarFallback}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* 2. 닉네임 */}
        <div
          className="absolute left-0 right-0 flex justify-center px-[4cqw]"
          style={{ top: "77%", transform: "translateY(-50%)" }}
        >
          <div className="inline-flex min-h-0 min-w-0 max-w-[78%] items-center justify-center">
            <span
              className="truncate text-center font-bold leading-none tracking-widest text-purple-200 drop-shadow-md"
              style={{
                fontFamily: '"Maplestory Bold", sans-serif',
                textShadow: "0 0 1px rgba(0,0,0,0.8), 0 1px 2px rgba(0,0,0,0.5)",
                fontSize: "clamp(1.5rem, 11.5cqw, 2.5rem)",
              }}
            >
              {rigger.name}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

/** 골드 카드 이미지 배경: 원형 마크·닉네임·별 동일 레이아웃, 골드 테마 */
function GoldCardWithImage({ rigger }: { rigger: Rigger }) {
  const starCount = rigger.stars ?? TIER_STARS.gold;
  return (
    <article
      className="@container relative flex w-full min-w-0 flex-col overflow-hidden rounded-xl border-2 border-amber-500/80 shadow-lg shadow-amber-500/20 ring-2 ring-amber-500/30"
      style={{
        backgroundImage: "url(/rigger-card-gold.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      aria-label={`${rigger.name}, 골드 등급`}
    >
      <div className="relative aspect-[3/4] min-h-[190px] w-full min-w-0 pb-12 py-3 sm:min-h-[210px] sm:pb-14 sm:py-4">
        {/* 1. 원형 링: 마크 */}
        <div
          className="absolute left-0 right-0 flex justify-center"
          style={{ top: "41%", transform: "translateY(-50%)" }}
        >
          <div
            className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-black/90 shadow-inner ring-2 ring-amber-500/60"
            style={{
              width: "61cqw",
              aspectRatio: "1",
              borderWidth: "max(2px, 0.5cqw)",
              borderStyle: "solid",
              borderColor: "rgba(245, 158, 11, 0.95)",
              boxShadow: "inset 0 1px 2px rgba(0,0,0,0.5), 0 0 0 1px rgba(245, 158, 11, 0.4)",
            }}
          >
            <div className="absolute inset-0 overflow-hidden rounded-full">
              {rigger.markImageUrl ? (
                <img
                  src={rigger.markImageUrl}
                  alt=""
                  className="h-full w-full object-cover object-center"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Avatar className="h-[70%] w-[70%]" size="lg">
                    <AvatarImage src={rigger.avatarUrl ?? undefined} alt="" />
                    <AvatarFallback className="text-base font-medium text-amber-200/90 sm:text-lg">
                      {rigger.avatarFallback}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* 2. 닉네임 */}
        <div
          className="absolute left-0 right-0 flex justify-center px-[4cqw]"
          style={{ top: "77%", transform: "translateY(-50%)" }}
        >
          <div className="inline-flex min-h-0 min-w-0 max-w-[78%] items-center justify-center">
            <span
              className="truncate text-center font-bold leading-none tracking-widest text-amber-200 drop-shadow-md"
              style={{
                fontFamily: '"Maplestory Bold", sans-serif',
                textShadow: "0 0 1px rgba(0,0,0,0.8), 0 1px 2px rgba(0,0,0,0.5)",
                fontSize: "clamp(1.5rem, 11.5cqw, 2.5rem)",
              }}
            >
              {rigger.name}
            </span>
          </div>
        </div>
        {/* 3. 별 */}
        <div
          className="absolute left-0 right-0 flex justify-center"
          style={{ bottom: "11.5%" }}
        >
          <div className="flex items-center justify-center gap-[0.125rem]">
            {Array.from({ length: starCount }, (_, i) => (
              <Star
                key={i}
                className={cn("size-[7cqw] min-w-3 min-h-3 shrink-0", TIER_STYLES.gold.star)}
                strokeWidth={1.5}
              />
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

/** 실버 카드 이미지 배경: 원형 마크·닉네임·별 동일 레이아웃, 실버 테마 */
function SilverCardWithImage({ rigger }: { rigger: Rigger }) {
  const starCount = rigger.stars ?? TIER_STARS.silver;
  return (
    <article
      className="@container relative flex w-full min-w-0 flex-col overflow-hidden rounded-xl border-2 border-slate-400/80 shadow-lg shadow-slate-400/20 ring-2 ring-slate-400/30"
      style={{
        backgroundImage: "url(/rigger-card-silver.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      aria-label={`${rigger.name}, 실버 등급`}
    >
      <div className="relative aspect-[3/4] min-h-[190px] w-full min-w-0 pb-12 py-3 sm:min-h-[210px] sm:pb-14 sm:py-4">
        {/* 1. 원형 링: 마크 */}
        <div
          className="absolute left-0 right-0 flex justify-center"
          style={{ top: "41%", transform: "translateY(-50%)" }}
        >
          <div
            className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-black/90 shadow-inner ring-2 ring-slate-400/60"
            style={{
              width: "61cqw",
              aspectRatio: "1",
              borderWidth: "max(2px, 0.5cqw)",
              borderStyle: "solid",
              borderColor: "rgba(148, 163, 184, 0.95)",
              boxShadow: "inset 0 1px 2px rgba(0,0,0,0.5), 0 0 0 1px rgba(148, 163, 184, 0.4)",
            }}
          >
            <div className="absolute inset-0 overflow-hidden rounded-full">
              {rigger.markImageUrl ? (
                <img
                  src={rigger.markImageUrl}
                  alt=""
                  className="h-full w-full object-cover object-center"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Avatar className="h-[70%] w-[70%]" size="lg">
                    <AvatarImage src={rigger.avatarUrl ?? undefined} alt="" />
                    <AvatarFallback className="text-base font-medium text-slate-200/90 sm:text-lg">
                      {rigger.avatarFallback}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* 2. 닉네임 */}
        <div
          className="absolute left-0 right-0 flex justify-center px-[4cqw]"
          style={{ top: "77%", transform: "translateY(-50%)" }}
        >
          <div className="inline-flex min-h-0 min-w-0 max-w-[78%] items-center justify-center">
            <span
              className="truncate text-center font-bold leading-none tracking-widest text-slate-200 drop-shadow-md"
              style={{
                fontFamily: '"Maplestory Bold", sans-serif',
                textShadow: "0 0 1px rgba(0,0,0,0.8), 0 1px 2px rgba(0,0,0,0.5)",
                fontSize: "clamp(1.5rem, 11.5cqw, 2.5rem)",
              }}
            >
              {rigger.name}
            </span>
          </div>
        </div>
        {/* 3. 별 */}
        <div
          className="absolute left-0 right-0 flex justify-center"
          style={{ bottom: "11.5%" }}
        >
          <div className="flex items-center justify-center gap-[0.125rem]">
            {Array.from({ length: starCount }, (_, i) => (
              <Star
                key={i}
                className={cn("size-[7cqw] min-w-3 min-h-3 shrink-0", TIER_STYLES.silver.star)}
                strokeWidth={1.5}
              />
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

/** 브론즈 카드 이미지 배경: 기존 텍스트/별 영역을 덮고 닉네임·별 개수만 표시 */
function BronzeCardWithImage({ rigger }: { rigger: Rigger }) {
  const starCount = rigger.stars ?? TIER_STARS.bronze;
  return (
    <article
      className="@container relative flex w-full min-w-0 flex-col overflow-hidden rounded-xl border-2 border-amber-700/80 shadow-lg shadow-amber-800/20 ring-2 ring-amber-700/30"
      style={{
        backgroundImage: "url(/rigger-card-bronze.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      aria-label={`${rigger.name}, 브론즈 등급`}
    >
      <div className="relative aspect-[3/4] min-h-[190px] w-full min-w-0 pb-12 py-3 sm:min-h-[210px] sm:pb-14 sm:py-4">
        {/* 1. 원형 링: 마크 - 카드 기준 비율 위치·크기 (리사이즈 시에도 동일 비율 유지) */}
        <div
          className="absolute left-0 right-0 flex justify-center"
          style={{ top: "41%", transform: "translateY(-50%)" }}
        >
          <div
            className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-black/90 shadow-inner ring-2 ring-amber-800/60"
            style={{
              width: "61cqw",
              aspectRatio: "1",
              borderWidth: "max(2px, 0.5cqw)",
              borderStyle: "solid",
              borderColor: "rgba(180, 115, 51, 0.95)",
              boxShadow: "inset 0 1px 2px rgba(0,0,0,0.5), 0 0 0 1px rgba(180, 115, 51, 0.4)",
            }}
          >
            <div className="absolute inset-0 overflow-hidden rounded-full">
              {rigger.markImageUrl ? (
                <img
                  src={rigger.markImageUrl}
                  alt=""
                  className="h-full w-full object-cover object-center"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Avatar className="h-[70%] w-[70%]" size="lg">
                    <AvatarImage src={rigger.avatarUrl ?? undefined} alt="" />
                    <AvatarFallback className="text-base font-medium text-amber-200/90 sm:text-lg">
                      {rigger.avatarFallback}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* 2. 닉네임 - 카드 기준 비율 위치·크기로 고정 (리사이즈 시에도 동일 비율 유지) */}
        <div
          className="absolute left-0 right-0 flex justify-center px-[4cqw]"
          style={{ top: "77%", transform: "translateY(-50%)" }}
        >
          <div className="inline-flex min-h-0 min-w-0 max-w-[78%] items-center justify-center">
            <span
              className="truncate text-center font-bold leading-none tracking-widest text-amber-600 drop-shadow-md"
              style={{
                fontFamily: '"Maplestory Bold", sans-serif',
                textShadow: "0 0 1px rgba(0,0,0,0.8), 0 1px 2px rgba(0,0,0,0.5)",
                fontSize: "clamp(1.5rem, 11.5cqw, 2.5rem)",
              }}
            >
              {rigger.name}
            </span>
          </div>
        </div>
        {/* 3. 별: 등급 - 카드 크기 대비 항상 동일 비율 위치 */}
        <div
          className="absolute left-0 right-0 flex justify-center"
          style={{ bottom: "11.5%" }}
        >
          <div className="flex items-center justify-center gap-[0.125rem]">
            {Array.from({ length: starCount }, (_, i) => (
              <Star
                key={i}
                className={cn("size-[7cqw] min-w-3 min-h-3 shrink-0", TIER_STYLES.bronze.star)}
                strokeWidth={1.5}
              />
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

export function RiggerTierCard({ rigger }: { rigger: Rigger }) {
  const tier = rigger.tier;
  const styles = TIER_STYLES[tier];
  const starCount = TIER_STARS[tier];

  if (tier === "legend") {
    return <LegendCardWithImage rigger={rigger} />;
  }
  if (tier === "bronze") {
    return <BronzeCardWithImage rigger={rigger} />;
  }
  if (tier === "silver") {
    return <SilverCardWithImage rigger={rigger} />;
  }
  if (tier === "gold") {
    return <GoldCardWithImage rigger={rigger} />;
  }

  return (
    <article
      className={cn(
        "flex w-full min-h-[180px] min-w-0 flex-col rounded-xl border-2 bg-card/95 p-3 ring-2 backdrop-blur sm:p-4",
        styles.border,
        styles.glow,
      )}
      aria-label={`${rigger.name}, ${tier} 등급`}
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <Avatar className="size-14 shrink-0 sm:size-16" size="lg">
          <AvatarImage src={rigger.avatarUrl ?? undefined} alt="" />
          <AvatarFallback className="text-base font-medium">
            {rigger.avatarFallback}
          </AvatarFallback>
        </Avatar>
      </div>
      <div
        className={cn(
          "mt-2 rounded-lg border px-3 py-2 text-center text-sm font-medium",
          styles.banner,
        )}
      >
        {rigger.name}
      </div>
      <div className="mt-2 flex justify-center gap-0.5" aria-hidden>
        {Array.from({ length: starCount }, (_, i) => (
          <Star
            key={i}
            className={cn("size-4 shrink-0", styles.star)}
            strokeWidth={1.5}
          />
        ))}
      </div>
    </article>
  );
}
