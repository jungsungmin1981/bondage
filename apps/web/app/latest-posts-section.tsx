"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import type { EmblaCarouselType } from "embla-carousel";
import Link from "next/link";
import type { LatestPublicPostItem } from "@workspace/db";

function clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max);
}

function getHref(item: LatestPublicPostItem): string | null {
  if (!item.authorProfileId) return null;
  return item.authorType === "rigger"
    ? `/rigger/${item.authorProfileId}`
    : `/bunnies/${item.authorProfileId}`;
}

export function LatestPostsSection({ posts }: { posts: LatestPublicPostItem[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "center",
    dragFree: false,
  });

  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  /**
   * scroll 이벤트마다 각 슬라이드의 3D 스타일을 직접 DOM에 적용.
   * CSS transition 없이 실시간 업데이트하므로 loop 포함 자연스럽게 동작.
   */
  const applyTween = useCallback((api: EmblaCarouselType) => {
    const snapList = api.scrollSnapList();
    const progress = api.scrollProgress();
    const count = snapList.length;
    if (count === 0) return;

    const step = count > 1 ? Math.abs((snapList[1] ?? 0) - (snapList[0] ?? 0)) : 1;

    snapList.forEach((snap, idx) => {
      const el = slideRefs.current[idx];
      if (!el) return;

      // 현재 스크롤 위치와 이 슬라이드 snap 간의 거리 (슬라이드 단위)
      let diff = (snap - progress) / step;

      // loop 보정: 절반 이상 떨어져 있으면 반대 방향으로 wrap
      if (diff > count / 2) diff -= count;
      if (diff < -count / 2) diff += count;

      const abs = Math.abs(diff);
      const sign = diff >= 0 ? 1 : -1;

      if (abs > 2.5) {
        el.style.opacity = "0";
        el.style.pointerEvents = "none";
        el.style.transform = "";
        return;
      }

      const rotateY = sign * clamp(abs * 44, 0, 82);
      const translateX = sign * abs * 20;
      const scale = clamp(1 - abs * 0.18, 0.55, 1);
      const opacity = clamp(1 - abs * 0.4, 0, 1);
      const zIndex = Math.round(50 - abs * 10);

      el.style.transform = `perspective(900px) rotateY(${rotateY}deg) translateX(${translateX}%) scale(${scale})`;
      el.style.opacity = String(opacity);
      el.style.zIndex = String(zIndex);
      el.style.pointerEvents = abs < 1.5 ? "auto" : "none";
    });
  }, []);

  useEffect(() => {
    if (!emblaApi) return;

    // 초기 적용
    applyTween(emblaApi);

    const onScroll = () => applyTween(emblaApi);
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    const onReInit = () => {
      applyTween(emblaApi);
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };

    emblaApi.on("scroll", onScroll);
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onReInit);

    return () => {
      emblaApi.off("scroll", onScroll);
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onReInit);
    };
  }, [emblaApi, applyTween]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  if (posts.length === 0) return null;

  return (
    <section className="mb-14">
      <h2 className="mb-4 text-base font-semibold tracking-wide text-white/90 sm:text-lg">
        최신 게시물
      </h2>

      <div className="relative">
        {/* Embla 뷰포트 */}
        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex touch-pan-y">
            {posts.map((item, i) => {
              const href = getHref(item);
              const isCenter = i === selectedIndex;

              const cardContent = (
                <div
                  className={`relative overflow-hidden rounded-2xl border-2 bg-black/50 ${
                    isCenter
                      ? "border-white/40 shadow-[0_8px_40px_rgba(0,0,0,0.6)]"
                      : "border-white/10 shadow-lg"
                  }`}
                >
                  <div className="relative aspect-[2/3] w-full overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.imagePath}
                      alt={item.caption ?? "게시물"}
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p
                      className={`truncate font-semibold text-white drop-shadow-md ${
                        isCenter ? "text-sm" : "text-xs"
                      }`}
                    >
                      {item.authorNickname ?? "알 수 없음"}
                    </p>
                    {item.caption && isCenter && (
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-white/65">
                        {item.caption}
                      </p>
                    )}
                  </div>
                </div>
              );

              return (
                <div
                  key={item.postId}
                  ref={(el) => { slideRefs.current[i] = el; }}
                  className="relative min-w-0 flex-[0_0_58%] px-2 sm:flex-[0_0_42%]"
                  onClick={() => {
                    // 비중앙 카드 클릭 → 해당 카드로 이동
                    if (!isCenter && emblaApi) emblaApi.scrollTo(i);
                  }}
                >
                  {/* 중앙 카드만 프로필 링크 활성화 */}
                  {href && isCenter ? (
                    <Link href={href} className="block">
                      {cardContent}
                    </Link>
                  ) : (
                    <div className={!isCenter ? "cursor-pointer" : undefined}>
                      {cardContent}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 좌우 버튼 */}
        <button
          onClick={scrollPrev}
          aria-label="이전"
          className="absolute left-0 top-1/2 z-20 -translate-y-1/2 flex size-8 items-center justify-center rounded-full bg-black/50 text-white/80 shadow-lg backdrop-blur-sm transition hover:bg-black/70 hover:text-white sm:size-10"
        >
          <svg viewBox="0 0 24 24" className="size-4 sm:size-5" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          onClick={scrollNext}
          aria-label="다음"
          className="absolute right-0 top-1/2 z-20 -translate-y-1/2 flex size-8 items-center justify-center rounded-full bg-black/50 text-white/80 shadow-lg backdrop-blur-sm transition hover:bg-black/70 hover:text-white sm:size-10"
        >
          <svg viewBox="0 0 24 24" className="size-4 sm:size-5" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* 닷 인디케이터 */}
      <div className="mt-4 flex justify-center gap-1.5">
        {posts.map((_, idx) => (
          <button
            key={idx}
            onClick={() => emblaApi?.scrollTo(idx)}
            aria-label={`${idx + 1}번째`}
            className={`rounded-full transition-all duration-300 ${
              idx === selectedIndex
                ? "h-1.5 w-4 bg-white"
                : "size-1.5 bg-white/35 hover:bg-white/60"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
