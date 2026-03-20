"use client";

import { useState, type ReactNode } from "react";
import { Star } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import type { Rigger, RiggerTier } from "@/lib/rigger-sample";
import { TIER_STARS } from "@/lib/rigger-sample";
import { SuspensionRemainingTime } from "@/components/suspension-remaining-time";

/** 카드 내 원형 마크 공통 래퍼 + 편집 시 Popover(신규 사진 파일 선택) */
function TierMarkCircle({
  rigger,
  markImageUrl,
  ringClassName,
  ringStyle,
  fallbackClassName,
  onChooseImage,
}: {
  rigger: Rigger;
  markImageUrl: string | null | undefined;
  ringClassName: string;
  ringStyle: React.CSSProperties;
  fallbackClassName: string;
  /** 파일 선택 시 콜백(미리보기는 부모에서 blob URL 등으로 처리) */
  onChooseImage?: (file: File) => void;
}) {
  const [open, setOpen] = useState(false);
  const displayMarkUrl = markImageUrl?.trim() || "/default-rigger-mark.png";
  const showImg = Boolean(displayMarkUrl);

  const inner = (
    <div className="absolute inset-0 overflow-hidden rounded-full">
      {showImg ? (
        <img
          src={displayMarkUrl}
          alt=""
          className="h-full w-full object-contain object-center bg-black/90"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Avatar className="h-[70%] w-[70%]" size="lg">
            <AvatarImage src={rigger.avatarUrl ?? undefined} alt="" />
            <AvatarFallback
              className={cn("text-base font-medium sm:text-lg", fallbackClassName)}
            >
              {rigger.avatarFallback}
            </AvatarFallback>
          </Avatar>
        </div>
      )}
    </div>
  );

  const circleShell = (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-black/90 shadow-inner ring-2",
        ringClassName,
      )}
      style={{
        width: "61cqw",
        aspectRatio: "1",
        borderWidth: "max(2px, 0.5cqw)",
        borderStyle: "solid",
        ...ringStyle,
      }}
    >
      {inner}
    </div>
  );

  if (onChooseImage) {
    return (
      <div
        className="absolute left-0 right-0 flex justify-center"
        style={{ top: "41%", transform: "translateY(-50%)" }}
      >
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="cursor-pointer rounded-full border-0 bg-transparent p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="마크 사진 변경"
            >
              {circleShell}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="center">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              마크로 쓸 사진을 선택하세요
            </p>
            <p className="mb-3 text-xs text-muted-foreground">
              저장 버튼을 눌러야 서버에 반영됩니다.
            </p>
            {/* 파일 선택 : 취소 = 3 : 1 폭 비율, 높이 동일 h-7 */}
            <div className="grid h-7 grid-cols-4 items-center gap-2">
              <label className="col-span-3 flex h-7 min-w-0 cursor-pointer">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      onChooseImage(f);
                      setOpen(false);
                    }
                    e.target.value = "";
                  }}
                />
                <span className="flex h-7 w-full items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium leading-none hover:bg-muted">
                  파일 선택
                </span>
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="col-span-1 h-7 w-full min-w-0 px-2"
                onClick={() => setOpen(false)}
              >
                취소
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <div
      className="absolute left-0 right-0 flex justify-center"
      style={{ top: "41%", transform: "translateY(-50%)" }}
    >
      {circleShell}
    </div>
  );
}

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

export type RiggerTierCardProps = {
  rigger: Rigger;
  /** 마크 클릭 시 선택 목록·콜백 (본인 편집용) */
  markPick?: { onChooseImage: (file: File) => void };
  /** 등급 카드 배경 이미지를 임시로 덮어쓸 때 사용 (관리자 미리보기용) */
  backgroundOverrideUrl?: string;
  /** 계정 사용 제한 시 카드 위 감옥 이미지 URL (예: /jail-card.png) */
  jailOverlayUrl?: string | null;
  /** 정지 해제 예정 시각 ISO 문자열. null이면 영구. 상세보기에서만 전달 시 남은 시간 표시 */
  suspendedUntil?: string | null;
};

/** 레전드 카드 이미지 배경: 원형 마크·닉네임만 표시 (별 없음), 레전드(퍼플) 테마 */
function LegendCardWithImage({
  rigger,
  markPick,
  backgroundOverrideUrl,
}: RiggerTierCardProps) {
  return (
    <article
      className="@container relative flex w-full min-w-0 flex-col overflow-hidden rounded-xl border-2 border-purple-500/80 shadow-lg shadow-purple-500/20 ring-2 ring-purple-500/30"
      style={{
        backgroundImage: `url(${backgroundOverrideUrl ?? "/rigger-card-legend.png"})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      aria-label={`${rigger.name}, 레전드 등급`}
    >
      <div className="relative aspect-[3/4] min-h-[190px] w-full min-w-0 pb-12 py-3 sm:min-h-[210px] sm:pb-14 sm:py-4">
        <TierMarkCircle
          rigger={rigger}
          markImageUrl={rigger.markImageUrl}
          ringClassName="ring-purple-500/60"
          ringStyle={{
            borderColor: "rgba(168, 85, 247, 0.95)",
            boxShadow:
              "inset 0 1px 2px rgba(0,0,0,0.5), 0 0 0 1px rgba(168, 85, 247, 0.4)",
          }}
          fallbackClassName="text-purple-200/90"
          onChooseImage={markPick?.onChooseImage}
        />
        {/* 2. 닉네임 */}
        <div
          className="absolute left-0 right-0 text-center"
          style={{
            top: "77%",
            transform: "translateY(-50%)",
            padding: "0 6px",
            fontFamily: 'var(--font-rigger-card), system-ui, sans-serif',
            fontSize: "clamp(1.5rem, 11.5cqw, 2.5rem)",
            fontWeight: "bold",
            lineHeight: 1,
            color: "#e9d5ff",
            textShadow:
              "0 0 6px rgba(0,0,0,1), 0 0 3px rgba(0,0,0,1), 1px 1px 0 rgba(0,0,0,0.9), -1px -1px 0 rgba(0,0,0,0.9), 1px -1px 0 rgba(0,0,0,0.9), -1px 1px 0 rgba(0,0,0,0.9)",
          }}
        >
          {rigger.name}
        </div>
      </div>
    </article>
  );
}

/** 골드 카드 이미지 배경: 원형 마크·닉네임·별 동일 레이아웃, 골드 테마 */
function GoldCardWithImage({
  rigger,
  markPick,
  backgroundOverrideUrl,
}: RiggerTierCardProps) {
  const starCount = rigger.stars ?? TIER_STARS.gold;
  return (
    <article
      className="@container relative flex w-full min-w-0 flex-col overflow-hidden rounded-xl border-2 border-amber-500/80 shadow-lg shadow-amber-500/20 ring-2 ring-amber-500/30"
      style={{
        backgroundImage: `url(${backgroundOverrideUrl ?? "/rigger-card-gold.png"})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      aria-label={`${rigger.name}, 골드 등급`}
    >
      <div className="relative aspect-[3/4] min-h-[190px] w-full min-w-0 pb-12 py-3 sm:min-h-[210px] sm:pb-14 sm:py-4">
        <TierMarkCircle
          rigger={rigger}
          markImageUrl={rigger.markImageUrl}
          ringClassName="ring-amber-500/60"
          ringStyle={{
            borderColor: "rgba(245, 158, 11, 0.95)",
            boxShadow:
              "inset 0 1px 2px rgba(0,0,0,0.5), 0 0 0 1px rgba(245, 158, 11, 0.4)",
          }}
          fallbackClassName="text-amber-200/90"
          onChooseImage={markPick?.onChooseImage}
        />
        {/* 2. 닉네임 */}
        <div
          className="absolute left-0 right-0 text-center"
          style={{
            top: "77%",
            transform: "translateY(-50%)",
            padding: "0 6px",
            fontFamily: 'var(--font-rigger-card), system-ui, sans-serif',
            fontSize: "clamp(1.5rem, 11.5cqw, 2.5rem)",
            fontWeight: "bold",
            lineHeight: 1,
            color: "#fde68a",
            textShadow:
              "0 0 6px rgba(0,0,0,1), 0 0 3px rgba(0,0,0,1), 1px 1px 0 rgba(0,0,0,0.9), -1px -1px 0 rgba(0,0,0,0.9), 1px -1px 0 rgba(0,0,0,0.9), -1px 1px 0 rgba(0,0,0,0.9)",
          }}
        >
          {rigger.name}
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
function SilverCardWithImage({
  rigger,
  markPick,
  backgroundOverrideUrl,
}: RiggerTierCardProps) {
  const starCount = rigger.stars ?? TIER_STARS.silver;
  return (
    <article
      className="@container relative flex w-full min-w-0 flex-col overflow-hidden rounded-xl border-2 border-slate-400/80 shadow-lg shadow-slate-400/20 ring-2 ring-slate-400/30"
      style={{
        backgroundImage: `url(${backgroundOverrideUrl ?? "/rigger-card-silver.png"})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      aria-label={`${rigger.name}, 실버 등급`}
    >
      <div className="relative aspect-[3/4] min-h-[190px] w-full min-w-0 pb-12 py-3 sm:min-h-[210px] sm:pb-14 sm:py-4">
        <TierMarkCircle
          rigger={rigger}
          markImageUrl={rigger.markImageUrl}
          ringClassName="ring-slate-400/60"
          ringStyle={{
            borderColor: "rgba(148, 163, 184, 0.95)",
            boxShadow:
              "inset 0 1px 2px rgba(0,0,0,0.5), 0 0 0 1px rgba(148, 163, 184, 0.4)",
          }}
          fallbackClassName="text-slate-200/90"
          onChooseImage={markPick?.onChooseImage}
        />
        {/* 2. 닉네임 */}
        <div
          className="absolute left-0 right-0 text-center"
          style={{
            top: "77%",
            transform: "translateY(-50%)",
            padding: "0 6px",
            fontFamily: 'var(--font-rigger-card), system-ui, sans-serif',
            fontSize: "clamp(1.5rem, 11.5cqw, 2.5rem)",
            fontWeight: "bold",
            lineHeight: 1,
            color: "#e2e8f0",
            textShadow:
              "0 0 6px rgba(0,0,0,1), 0 0 3px rgba(0,0,0,1), 1px 1px 0 rgba(0,0,0,0.9), -1px -1px 0 rgba(0,0,0,0.9), 1px -1px 0 rgba(0,0,0,0.9), -1px 1px 0 rgba(0,0,0,0.9)",
          }}
        >
          {rigger.name}
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
function BronzeCardWithImage({
  rigger,
  markPick,
  backgroundOverrideUrl,
}: RiggerTierCardProps) {
  const starCount = rigger.stars ?? TIER_STARS.bronze;
  return (
    <article
      className="@container relative flex w-full min-w-0 flex-col overflow-hidden rounded-xl border-2 border-amber-700/80 shadow-lg shadow-amber-800/20 ring-2 ring-amber-700/30"
      style={{
        backgroundImage: `url(${backgroundOverrideUrl ?? "/rigger-card-bronze.png"})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      aria-label={`${rigger.name}, 브론즈 등급`}
    >
      <div className="relative aspect-[3/4] min-h-[190px] w-full min-w-0 pb-12 py-3 sm:min-h-[210px] sm:pb-14 sm:py-4">
        <TierMarkCircle
          rigger={rigger}
          markImageUrl={rigger.markImageUrl}
          ringClassName="ring-amber-800/60"
          ringStyle={{
            borderColor: "rgba(180, 115, 51, 0.95)",
            boxShadow:
              "inset 0 1px 2px rgba(0,0,0,0.5), 0 0 0 1px rgba(180, 115, 51, 0.4)",
          }}
          fallbackClassName="text-amber-200/90"
          onChooseImage={markPick?.onChooseImage}
        />
        {/* 2. 닉네임 - 카드 기준 비율 위치·크기로 고정 */}
        <div
          className="absolute left-0 right-0 text-center"
          style={{
            top: "77%",
            transform: "translateY(-50%)",
            padding: "0 6px",
            fontFamily: 'var(--font-rigger-card), system-ui, sans-serif',
            fontSize: "clamp(1.5rem, 11.5cqw, 2.5rem)",
            fontWeight: "bold",
            lineHeight: 1,
            color: "#ffffff",
            textShadow:
              "0 0 6px rgba(0,0,0,1), 0 0 3px rgba(0,0,0,1), 1px 1px 0 rgba(0,0,0,0.9), -1px -1px 0 rgba(0,0,0,0.9), 1px -1px 0 rgba(0,0,0,0.9), -1px 1px 0 rgba(0,0,0,0.9)",
          }}
        >
          {rigger.name}
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

export function RiggerTierCard({
  rigger,
  markPick,
  backgroundOverrideUrl,
  jailOverlayUrl,
  suspendedUntil,
}: RiggerTierCardProps) {
  const tier = rigger.tier;
  const styles = TIER_STYLES[tier];
  const starCount = TIER_STARS[tier];

  let card: ReactNode;
  if (tier === "legend") {
    card = (
      <LegendCardWithImage
        rigger={rigger}
        markPick={markPick}
        backgroundOverrideUrl={backgroundOverrideUrl}
      />
    );
  } else if (tier === "bronze") {
    card = (
      <BronzeCardWithImage
        rigger={rigger}
        markPick={markPick}
        backgroundOverrideUrl={backgroundOverrideUrl}
      />
    );
  } else if (tier === "silver") {
    card = (
      <SilverCardWithImage
        rigger={rigger}
        markPick={markPick}
        backgroundOverrideUrl={backgroundOverrideUrl}
      />
    );
  } else if (tier === "gold") {
    card = (
      <GoldCardWithImage
        rigger={rigger}
        markPick={markPick}
        backgroundOverrideUrl={backgroundOverrideUrl}
      />
    );
  } else {
    card = (
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

  return (
    <div className="relative w-full min-w-0">
      {card}
      {jailOverlayUrl && (
        <>
          <img
            src={jailOverlayUrl}
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full rounded-xl object-cover object-center"
            aria-hidden
          />
          {suspendedUntil !== undefined && (
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 pt-8"
              aria-hidden
            >
              <SuspensionRemainingTime suspendedUntil={suspendedUntil ?? null} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
