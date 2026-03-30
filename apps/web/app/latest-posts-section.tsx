"use client";

import { useState } from "react";
import Link from "next/link";
import type { LatestPublicPostItem } from "@workspace/db";

function getHref(item: LatestPublicPostItem): string | null {
  if (!item.authorProfileId) return null;
  return item.authorType === "rigger"
    ? `/rigger/${item.authorProfileId}`
    : `/bunnies/${item.authorProfileId}`;
}

export function LatestPostsSection({
  posts,
}: {
  posts: LatestPublicPostItem[];
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (posts.length === 0) return null;

  /** 카드별 기본 Y 오프셋 (계단식) */
  const BASE_Y = 14; // px per card

  return (
    <section className="mb-10">
      <h2 className="mb-3 text-base font-semibold tracking-wide text-white/90 sm:text-lg">
        최신 게시물
      </h2>

      <div className="relative flex items-start select-none">
        {posts.map((item, i) => {
          const href = getHref(item);
          const baseY = i * BASE_Y;
          const isHovered = hoveredIdx === i;
          const isPushedRight = hoveredIdx !== null && i > hoveredIdx;
          const isPushedLeft = hoveredIdx !== null && i < hoveredIdx;

          let translateX = 0;
          let translateY = baseY;
          if (isHovered) {
            translateY = baseY - 20;
          } else if (isPushedRight) {
            translateX = 10;
            translateY = baseY;
          } else if (isPushedLeft) {
            translateX = -4;
            translateY = baseY;
          }

          const zIndex = isHovered ? 60 : (posts.length - i) * 10;

          const card = (
            <div
              className={`relative h-full overflow-hidden rounded-xl border-2 bg-black/40 transition-[filter] duration-200 ${
                isHovered
                  ? "border-white/40 brightness-110 shadow-2xl"
                  : "border-white/15 shadow-lg"
              } ${href ? "cursor-pointer" : ""}`}
            >
              <div className="relative aspect-[2/3] w-full overflow-hidden bg-black/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.imagePath}
                  alt={item.caption ?? "게시물"}
                  className="h-full w-full object-cover"
                  draggable={false}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-2">
                <p className="truncate text-xs font-semibold text-white drop-shadow-md">
                  {item.authorNickname ?? "알 수 없음"}
                </p>
                {item.caption && isHovered && (
                  <p className="mt-0.5 truncate text-[10px] text-white/65">
                    {item.caption}
                  </p>
                )}
              </div>
            </div>
          );

          return (
            <div
              key={item.postId}
              className="w-[28%]"
              style={{
                marginLeft: i === 0 ? 0 : "-10%",
                zIndex,
                transform: `translate(${translateX}px, ${translateY}px)`,
                transition: "transform 0.2s ease-out, z-index 0s",
                position: "relative",
              }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {href ? (
                <Link href={href} className="block h-full">
                  {card}
                </Link>
              ) : (
                card
              )}
            </div>
          );
        })}
      </div>

    </section>
  );
}
