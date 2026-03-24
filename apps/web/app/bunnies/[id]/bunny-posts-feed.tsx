"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  useCarousel,
} from "@workspace/ui/components/carousel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";
import type { SerializedBunnyPost, SerializedBunnyPhotoRow } from "@/lib/bunny-posts-types";
import { BUNNY_PAGE_SIZE } from "@/lib/bunny-posts-types";
import { loadMoreBunnyPosts } from "./post-feed-actions";
import { deleteBunnyPost, updateBunnyPostCaption } from "./photos/actions";
import { BunnyPhotoLikeButton } from "./bunny-photo-like-button";

/** 상세 다이얼로그 내 캐러셀 (2장 이상) */
function BunnyDetailCarouselSlides({
  photos,
  caption,
}: {
  photos: SerializedBunnyPhotoRow[];
  caption: string | null;
}) {
  const { scrollPrev, scrollNext, canScrollPrev, canScrollNext, api } = useCarousel();
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!api) return;
    setSelectedIndex(api.selectedScrollSnap());
    const onSelect = () => setSelectedIndex(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => { api.off("select", onSelect); };
  }, [api]);

  return (
    <>
      <div className="flex w-full max-w-full items-center justify-center gap-1 sm:gap-2">
        <div className="flex w-7 shrink-0 flex-col items-center justify-center sm:w-8">
          {canScrollPrev ? (
            <button
              type="button"
              onClick={scrollPrev}
              aria-label="이전 사진"
              className="flex h-9 w-7 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-muted/80 hover:text-foreground sm:h-10 sm:w-8"
            >
              <ChevronLeft className="size-5 sm:size-6" strokeWidth={1.5} />
            </button>
          ) : (
            <span className="h-9 w-7 sm:h-10 sm:w-8" aria-hidden />
          )}
        </div>
        <div className="min-h-[40dvh] min-w-0 flex-1" aria-hidden>
          <CarouselContent className="h-full w-full ml-0">
            {photos.map((photo) => (
              <CarouselItem key={photo.id} className="pl-0">
                <div className="flex h-full w-full justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.imagePath}
                    alt={caption ?? "등록된 사진"}
                    className="h-full w-auto max-h-[min(88dvh,calc(95dvh-7rem))] max-w-full object-contain object-center"
                    draggable={false}
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </div>
        <div className="flex w-7 shrink-0 flex-col items-center justify-center sm:w-8">
          {canScrollNext ? (
            <button
              type="button"
              onClick={scrollNext}
              aria-label="다음 사진"
              className="flex h-9 w-7 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-muted/80 hover:text-foreground sm:h-10 sm:w-8"
            >
              <ChevronRight className="size-5 sm:size-6" strokeWidth={1.5} />
            </button>
          ) : (
            <span className="h-9 w-7 sm:h-10 sm:w-8" aria-hidden />
          )}
        </div>
      </div>
      <p className="mt-2 rounded-full bg-muted/90 px-2 py-0.5 text-xs text-muted-foreground">
        {selectedIndex + 1} / {photos.length}
      </p>
    </>
  );
}

function BunnyPostCard({
  post,
  bunnyProfileId,
  sessionUserId,
  like,
  openDetailInitially,
}: {
  post: SerializedBunnyPost;
  bunnyProfileId: string;
  sessionUserId: string;
  like: { count: number; liked: boolean };
  openDetailInitially?: boolean;
}) {
  const router = useRouter();
  const [detailOpen, setDetailOpen] = useState(!!openDetailInitially);
  const [editOpen, setEditOpen] = useState(false);
  const [captionInput, setCaptionInput] = useState(post.caption ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const createdAt = post.createdAt ? new Date(post.createdAt) : null;
  const totalPhotos = post.photos.length;
  const isOwnPost = post.photos[0]?.userId === sessionUserId;
  const firstPhotoId = post.photos[0]?.id ?? "";

  const openDetail = useCallback(() => setDetailOpen(true), []);

  useEffect(() => {
    if (editOpen) setCaptionInput(post.caption ?? "");
  }, [editOpen, post.caption]);

  return (
    <li className="min-w-0">
      <div className="relative flex flex-col overflow-visible rounded-2xl border border-border bg-card p-2 shadow-sm">
        <p className="shrink-0 text-[10px] text-muted-foreground">
          {createdAt && !Number.isNaN(createdAt.getTime())
            ? createdAt.toLocaleString("ko-KR", { year: "numeric", month: "short", day: "numeric" })
            : ""}
        </p>
        <p
          className="mt-1 shrink-0 truncate text-xs font-medium text-foreground"
          title={post.caption?.trim() || "제목 없음"}
        >
          {post.caption?.trim() || "제목 없음"}
        </p>

        {/* 썸네일 */}
        <button
          type="button"
          className="mt-1 block w-full cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
          onClick={openDetail}
          aria-label="게시물 상세 보기"
        >
          <div className="relative h-52 w-full shrink-0 overflow-hidden rounded-xl bg-muted sm:h-60">
            {post.photos.length === 1 ? (
              <div className="relative h-full min-h-0 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.photos[0]!.imagePath}
                  alt={post.caption ?? "등록된 사진"}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : post.photos.length === 2 ? (
              <div className="grid h-full grid-cols-2 gap-0.5">
                {post.photos.map((photo) => (
                  <div key={photo.id} className="relative min-h-0 overflow-hidden bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.imagePath} alt={post.caption ?? "등록된 사진"} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            ) : post.photos.length === 3 ? (
              <div className="grid h-full grid-cols-2 grid-rows-2 gap-0.5">
                <div className="relative row-span-2 min-h-0 overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={post.photos[0]!.imagePath} alt={post.caption ?? "등록된 사진"} className="h-full w-full object-cover" />
                </div>
                <div className="relative min-h-0 overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={post.photos[1]!.imagePath} alt={post.caption ?? "등록된 사진"} className="h-full w-full object-cover" />
                </div>
                <div className="relative min-h-0 overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={post.photos[2]!.imagePath} alt={post.caption ?? "등록된 사진"} className="h-full w-full object-cover" />
                </div>
              </div>
            ) : (
              <div className="grid h-full grid-cols-2 grid-rows-2 gap-0.5">
                {post.photos.map((photo) => (
                  <div key={photo.id} className="relative min-h-0 overflow-hidden bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.imagePath} alt={post.caption ?? "등록된 사진"} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </button>

        {/* 상세 Dialog */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent
            className={[
              "flex max-h-[95dvh] w-full flex-col overflow-hidden p-1.5 sm:p-2",
              "max-w-[calc(100vw-1rem)] sm:max-w-xl md:max-w-2xl",
              "overflow-y-auto",
            ].join(" ")}
            showCloseButton
          >
            <DialogHeader>
              <DialogTitle className="sr-only">게시물 상세</DialogTitle>
              <DialogDescription className="sr-only">
                게시물 이미지와 제목, 수정·삭제 옵션이 표시됩니다.
              </DialogDescription>
            </DialogHeader>
            <div className="flex min-h-0 flex-1 flex-col space-y-2 sm:space-y-3">
              <div className="grid grid-cols-3 items-center gap-3">
                <p className="min-w-0 text-xs text-muted-foreground">
                  {createdAt && !Number.isNaN(createdAt.getTime())
                    ? createdAt.toLocaleString("ko-KR", {
                        year: "numeric", month: "short", day: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })
                    : ""}
                </p>
                {isOwnPost && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="col-start-2 justify-self-center"
                    onClick={() => setEditOpen(true)}
                  >
                    수정
                  </Button>
                )}
                <span className="col-start-3" aria-hidden />
              </div>
              <p className="shrink-0 text-sm font-medium text-foreground">
                {post.caption?.trim() || "제목 없음"}
              </p>
              <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center">
                {totalPhotos === 0 ? (
                  <div className="flex min-h-[40dvh] w-full items-center justify-center text-sm text-muted-foreground">
                    이미지 없음
                  </div>
                ) : totalPhotos === 1 ? (
                  <div className="relative flex h-full w-full min-h-[40dvh] justify-center sm:min-h-[50dvh]">
                    <div className="flex h-full w-full justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={post.photos[0]!.imagePath}
                        alt={post.caption ?? "등록된 사진"}
                        className="h-full w-auto max-h-[min(88dvh,calc(95dvh-7rem))] max-w-full object-contain object-center"
                        draggable={false}
                      />
                    </div>
                  </div>
                ) : (
                  <Carousel className="w-full" opts={{ loop: false, align: "center" }}>
                    <BunnyDetailCarouselSlides photos={post.photos} caption={post.caption} />
                  </Carousel>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 수정/삭제 Dialog */}
        {isOwnPost && (
          <Dialog
            open={editOpen}
            onOpenChange={(open) => {
              setEditOpen(open);
              if (!open) { setDeleting(false); setSaving(false); }
            }}
          >
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>게시물 설정</DialogTitle>
                <DialogDescription className="sr-only">
                  제목 변경 및 게시물 삭제를 할 수 있습니다.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-sm font-medium">제목 수정</p>
                  <Input
                    value={captionInput}
                    onChange={(e) => setCaptionInput(e.target.value)}
                    maxLength={30}
                    placeholder="사진 제목 (최대 30자)"
                    disabled={saving || deleting}
                  />
                </div>
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-sm font-medium text-destructive">삭제</p>
                  <p className="mt-1 text-xs text-muted-foreground">삭제하면 되돌릴 수 없습니다.</p>
                  <div className="mt-3">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button type="button" variant="destructive" className="w-full" disabled={deleting}>
                          {deleting ? "삭제 중…" : "게시물 삭제"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>게시물을 삭제할까요?</AlertDialogTitle>
                          <AlertDialogDescription>이 작업은 되돌릴 수 없습니다.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={deleting}>취소</AlertDialogCancel>
                          <AlertDialogAction
                            variant="destructive"
                            disabled={deleting}
                            onClick={async () => {
                              if (deleting) return;
                              setDeleting(true);
                              try {
                                const res = await deleteBunnyPost(bunnyProfileId, post.postId);
                                if (res.ok) {
                                  setEditOpen(false);
                                  setDetailOpen(false);
                                  router.refresh();
                                  return;
                                }
                                alert(res.error);
                              } catch (e) {
                                alert(`삭제 중 오류가 발생했습니다.\n\n${e instanceof Error ? e.message : String(e)}`);
                              } finally {
                                setDeleting(false);
                              }
                            }}
                          >
                            삭제
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-col items-center gap-2">
                {captionInput.trim() !== (post.caption ?? "") && (
                  <Button
                    type="button"
                    className="w-full max-w-xs bg-blue-600 text-white hover:bg-blue-700"
                    disabled={saving || deleting}
                    onClick={async () => {
                      if (saving || deleting) return;
                      setSaving(true);
                      try {
                        const res = await updateBunnyPostCaption(bunnyProfileId, post.postId, captionInput);
                        if (!res.ok) { alert(res.error); return; }
                        setEditOpen(false);
                        setDetailOpen(false);
                        router.refresh();
                      } catch (e) {
                        alert(`저장 중 오류가 발생했습니다.\n\n${e instanceof Error ? e.message : String(e)}`);
                      } finally {
                        setSaving(false);
                      }
                    }}
                  >
                    {saving ? "저장 중…" : "저장"}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full max-w-xs"
                  onClick={() => setEditOpen(false)}
                  disabled={saving || deleting}
                >
                  닫기
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* 좋아요 */}
        <div className="relative z-10 mt-2 shrink-0 border-t border-border/60 pt-2">
          <div className="flex items-center gap-6 pl-3 sm:pl-4">
            <div className="flex h-7 shrink-0 items-center">
              {firstPhotoId && (
                <BunnyPhotoLikeButton
                  bunnyProfileId={bunnyProfileId}
                  photoId={firstPhotoId}
                  initialCount={like.count}
                  initialLiked={like.liked}
                  isOwnPost={isOwnPost}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

type Props = {
  bunnyProfileId: string;
  sessionUserId: string;
  isOwnProfile: boolean;
  initialPosts: SerializedBunnyPost[];
  initialLikeByPhotoId: Record<string, { count: number; liked: boolean }>;
  initialHasMore: boolean;
};

export function BunnyPostsFeed({
  bunnyProfileId,
  sessionUserId,
  initialPosts,
  initialLikeByPhotoId,
  initialHasMore,
}: Props) {
  const [posts, setPosts] = useState<SerializedBunnyPost[]>(initialPosts);
  const [likeByPhotoId, setLikeByPhotoId] = useState(initialLikeByPhotoId);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const offsetRef = useRef(initialPosts.length);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPosts(initialPosts);
    setLikeByPhotoId(initialLikeByPhotoId);
    setHasMore(initialHasMore);
    offsetRef.current = initialPosts.length;
  }, [initialPosts, initialLikeByPhotoId, initialHasMore]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const result = await loadMoreBunnyPosts(
        bunnyProfileId,
        offsetRef.current,
        BUNNY_PAGE_SIZE,
        sessionUserId,
      );
      if (result.posts.length === 0) { setHasMore(false); return; }
      setPosts((prev) => [...prev, ...result.posts]);
      setLikeByPhotoId((prev) => ({ ...prev, ...result.likeByPhotoId }));
      offsetRef.current += result.posts.length;
      setHasMore(result.hasMore);
    } finally {
      setLoading(false);
    }
  }, [bunnyProfileId, sessionUserId, loading, hasMore]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) loadMore(); },
      { root: null, rootMargin: "200px", threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loadMore]);

  if (posts.length === 0) {
    return (
      <p className="mt-2 text-sm text-muted-foreground">등록된 사진이 없습니다.</p>
    );
  }

  return (
    <>
      <ul className="mt-3 grid list-none grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {posts.map((post) => {
          const firstPhotoId = post.photos[0]?.id ?? "";
          return (
            <BunnyPostCard
              key={post.postId}
              post={post}
              bunnyProfileId={bunnyProfileId}
              sessionUserId={sessionUserId}
              like={likeByPhotoId[firstPhotoId] ?? { count: 0, liked: false }}
            />
          );
        })}
      </ul>
      {hasMore && (
        <div
          ref={sentinelRef}
          className="flex h-16 items-center justify-center text-xs text-muted-foreground"
        >
          {loading ? "불러오는 중…" : "스크롤하면 더 보기"}
        </div>
      )}
    </>
  );
}
