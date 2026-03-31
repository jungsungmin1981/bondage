"use client";

import { useState, useCallback, useTransition } from "react";
import Link from "next/link";
import { Heart, X, ChevronLeft, ChevronRight } from "lucide-react";
import type { LatestPublicPostItem } from "@workspace/db";
import { toggleLatestPostLike } from "./actions";

type LikeState = { count: number; liked: boolean };

type Props = {
  posts: LatestPublicPostItem[];
  likeStates: Record<string, LikeState>;
};

function getProfileHref(item: LatestPublicPostItem): string | null {
  if (!item.authorProfileId) return null;
  return item.authorType === "rigger"
    ? `/rigger/${item.authorProfileId}`
    : `/bunnies/${item.authorProfileId}`;
}

export function LatestPostsGrid({ posts, likeStates: initialLikeStates }: Props) {
  const [likeStates, setLikeStates] = useState<Record<string, LikeState>>(initialLikeStates);
  const [activePost, setActivePost] = useState<LatestPublicPostItem | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [pendingLikes, startLikeTransition] = useTransition();

  const openModal = useCallback((post: LatestPublicPostItem) => {
    setActivePost(post);
    setSlideIndex(0);
  }, []);

  const closeModal = useCallback(() => {
    setActivePost(null);
    setSlideIndex(0);
  }, []);

  const goPrev = useCallback(() => {
    setSlideIndex((i) => (activePost ? (i - 1 + activePost.imagePaths.length) % activePost.imagePaths.length : 0));
  }, [activePost]);

  const goNext = useCallback(() => {
    setSlideIndex((i) => (activePost ? (i + 1) % activePost.imagePaths.length : 0));
  }, [activePost]);

  const handleLike = useCallback(
    (postId: string) => {
      startLikeTransition(async () => {
        const result = await toggleLatestPostLike(postId);
        if (result.ok) {
          setLikeStates((prev) => ({
            ...prev,
            [postId]: { count: result.count, liked: result.liked },
          }));
        }
      });
    },
    [],
  );

  const activeLike = activePost
    ? (likeStates[activePost.postId] ?? { count: 0, liked: false })
    : null;

  const activeImages = activePost?.imagePaths ?? [];
  const hasMultiple = activeImages.length > 1;

  return (
    <>
      {/* 그리드 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-3">
        {posts.map((post) => {
          const like = likeStates[post.postId] ?? { count: 0, liked: false };
          return (
            <button
              key={post.postId}
              type="button"
              className="group relative overflow-hidden rounded-xl bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => openModal(post)}
            >
              <div className="aspect-[2/3] w-full overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.imagePath}
                  alt={post.caption ?? post.authorNickname ?? "게시물"}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              {/* 여러 장 뱃지 */}
              {post.imagePaths.length > 1 && (
                <div className="absolute right-1.5 top-1.5 flex items-center gap-0.5 rounded-md bg-black/60 px-1.5 py-0.5 backdrop-blur-sm">
                  <span className="text-[10px] font-semibold text-white">
                    1/{post.imagePaths.length}
                  </span>
                </div>
              )}
              {/* 하단 오버레이 */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-2">
                <p className="truncate text-[11px] font-semibold text-white sm:text-xs">
                  {post.authorNickname ?? "알 수 없음"}
                </p>
                {post.caption && (
                  <p className="truncate text-[10px] text-white/70">{post.caption}</p>
                )}
                {like.count > 0 && (
                  <div className="mt-0.5 flex items-center gap-0.5">
                    <Heart
                      className={`size-2.5 ${like.liked ? "fill-red-400 text-red-400" : "fill-white/60 text-white/60"}`}
                    />
                    <span className="text-[9px] text-white/70">{like.count}</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* 모달 */}
      {activePost && activeLike && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          {/* 배경 오버레이 */}
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" aria-hidden />

          {/* 모달 패널 */}
          <div
            className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl bg-background shadow-2xl sm:max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 닫기 버튼 */}
            <button
              type="button"
              onClick={closeModal}
              className="absolute right-3 top-3 z-20 flex size-8 items-center justify-center rounded-full bg-black/50 text-white/90 backdrop-blur-sm transition hover:bg-black/70"
              aria-label="닫기"
            >
              <X className="size-4" />
            </button>

            {/* 이미지 슬라이드 영역 */}
            <div
              className="relative aspect-[3/4] w-full overflow-hidden bg-muted"
              onTouchStart={(e) => setTouchStartX(e.touches[0]?.clientX ?? null)}
              onTouchEnd={(e) => {
                if (touchStartX === null || !hasMultiple) return;
                const diff = touchStartX - (e.changedTouches[0]?.clientX ?? touchStartX);
                if (diff > 50) goNext();
                else if (diff < -50) goPrev();
                setTouchStartX(null);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={activeImages[slideIndex]}
                src={activeImages[slideIndex] ?? activePost.imagePath}
                alt={`${activePost.caption ?? "게시물"} ${slideIndex + 1}/${activeImages.length}`}
                className="h-full w-full object-cover"
              />

              {/* 좌우 화살표 (여러 장일 때만) */}
              {hasMultiple && (
                <>
                  <button
                    type="button"
                    onClick={goPrev}
                    className="absolute left-2 top-1/2 z-10 -translate-y-1/2 flex size-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70 active:scale-95"
                    aria-label="이전 이미지"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    className="absolute right-2 top-1/2 z-10 -translate-y-1/2 flex size-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70 active:scale-95"
                    aria-label="다음 이미지"
                  >
                    <ChevronRight className="size-5" />
                  </button>

                  {/* 이미지 인디케이터 (닷) */}
                  <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1">
                    {activeImages.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSlideIndex(i)}
                        className={`rounded-full transition-all ${
                          i === slideIndex
                            ? "h-1.5 w-4 bg-white"
                            : "size-1.5 bg-white/50 hover:bg-white/80"
                        }`}
                        aria-label={`${i + 1}번째 이미지`}
                      />
                    ))}
                  </div>

                  {/* 장 수 표시 */}
                  <div className="absolute right-3 top-3 z-10 rounded-md bg-black/60 px-2 py-0.5 backdrop-blur-sm">
                    <span className="text-xs font-semibold text-white">
                      {slideIndex + 1}/{activeImages.length}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* 하단 정보 */}
            <div className="p-4">
              {/* 작성자 + 좋아요 */}
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {getProfileHref(activePost) ? (
                    <Link
                      href={getProfileHref(activePost)!}
                      className="font-semibold hover:underline underline-offset-2"
                      onClick={closeModal}
                    >
                      {activePost.authorNickname ?? "알 수 없음"}
                    </Link>
                  ) : (
                    <span className="font-semibold">{activePost.authorNickname ?? "알 수 없음"}</span>
                  )}
                  {activePost.caption && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-3">
                      {activePost.caption}
                    </p>
                  )}
                </div>

                {/* 좋아요 버튼 */}
                <button
                  type="button"
                  onClick={() => handleLike(activePost.postId)}
                  disabled={pendingLikes}
                  className={`flex min-h-[52px] min-w-[52px] flex-col items-center justify-center gap-1 rounded-2xl border-2 px-3 py-2 transition-all active:scale-95 ${
                    activeLike.liked
                      ? "border-red-400/60 bg-red-50 dark:bg-red-950/30"
                      : "border-border bg-muted/50 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-950/20"
                  } disabled:opacity-60`}
                  aria-label={activeLike.liked ? "좋아요 취소" : "좋아요"}
                >
                  <Heart
                    className={`size-6 transition-all ${
                      activeLike.liked
                        ? "fill-red-500 text-red-500 scale-110"
                        : "text-muted-foreground"
                    }`}
                  />
                  <span
                    className={`text-xs font-semibold ${
                      activeLike.liked ? "text-red-500" : "text-muted-foreground"
                    }`}
                  >
                    {activeLike.count}
                  </span>
                </button>
              </div>

              {/* 프로필 이동 버튼 */}
              {getProfileHref(activePost) && (
                <Link
                  href={getProfileHref(activePost)!}
                  onClick={closeModal}
                  className="mt-3 flex w-full items-center justify-center rounded-xl border bg-muted/50 py-2.5 text-sm font-medium transition hover:bg-muted"
                >
                  작성자 프로필 보기 →
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
