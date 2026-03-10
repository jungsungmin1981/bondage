"use client";

import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { ToggleGroup, ToggleGroupItem } from "@workspace/ui/components/toggle-group";
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
import type { SerializedPost } from "@/lib/rigger-posts-types";
import { PAGE_SIZE } from "@/lib/rigger-posts-constants";
import { loadMoreRiggerPosts } from "./post-feed-actions";
import { PostLikeButton } from "./post-like-button";
import { PostCommentBlock } from "./post-comment-block";
import { deleteOwnRiggerPost, updateOwnRiggerPostVisibility } from "./post-edit-actions";

const SWIPE_THRESHOLD_PX = 50;

type Props = {
  riggerId: string;
  sessionUserId: string;
  initialPosts: SerializedPost[];
  initialLikeByPostId: Record<string, { count: number; liked: boolean }>;
  initialCommentsByPhotoId: Record<string, unknown[]>;
  initialHasMore: boolean;
};

function PostCard({
  post,
  riggerId,
  sessionUserId,
  like,
  initialComments,
}: {
  post: SerializedPost;
  riggerId: string;
  sessionUserId: string;
  like: { count: number; liked: boolean };
  initialComments: React.ComponentProps<typeof PostCommentBlock>["initialComments"];
}) {
  const router = useRouter();
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [initialVisibility, setInitialVisibility] = useState<"public" | "private">("public");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const createdAt = post.createdAt ? new Date(post.createdAt) : null;
  const totalPhotos = post.photos.length;
  const isOwnPost = post.photos[0]?.userId === sessionUserId;
  const postVisibility: "public" | "private" =
    post.photos[0]?.visibility === "private" ? "private" : "public";
  const isPrivate = postVisibility === "private";
  const canGoPrev = totalPhotos > 1 && photoIndex > 0;
  const canGoNext = totalPhotos > 1 && photoIndex < totalPhotos - 1;

  const goPrev = useCallback(() => {
    if (canGoPrev) setPhotoIndex((i) => i - 1);
  }, [canGoPrev]);
  const goNext = useCallback(() => {
    if (canGoNext) setPhotoIndex((i) => i + 1);
  }, [canGoNext]);

  const openDetail = useCallback(() => {
    setPhotoIndex(0);
    setDetailOpen(true);
  }, []);

  useEffect(() => {
    if (!editOpen) return;
    setVisibility(postVisibility);
    setInitialVisibility(postVisibility);
    setSaving(false);
  }, [editOpen, postVisibility]);

  useEffect(() => {
    if (!detailOpen || totalPhotos <= 1) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setPhotoIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setPhotoIndex((i) => Math.min(totalPhotos - 1, i + 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detailOpen, totalPhotos]);

  return (
    <li className="min-w-0">
      <div className="relative flex flex-col overflow-visible rounded-2xl border border-border bg-card p-2 shadow-sm">
        <p className="shrink-0 text-[10px] text-muted-foreground">
          {createdAt && !Number.isNaN(createdAt.getTime())
            ? createdAt.toLocaleString("ko-KR", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })
            : ""}
        </p>
        <p
          className="mt-1 shrink-0 truncate text-xs font-medium text-foreground"
          title={post.caption?.trim() || "제목 없음"}
        >
          {post.caption?.trim() || "제목 없음"}
        </p>
        <button
          type="button"
          className="mt-1 block w-full cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
          onClick={openDetail}
          aria-label="게시물 상세 보기"
        >
          <div className="relative h-52 w-full shrink-0 overflow-hidden rounded-xl bg-muted sm:h-60">
            <div className="h-full w-full">
              {post.photos.length === 3 ? (
                <div className="grid h-full grid-cols-2 grid-rows-2 gap-0.5">
                  <div className="relative row-span-2 min-h-0 overflow-hidden bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.photos[0]!.imagePath}
                      alt={post.caption ?? "등록된 사진"}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="relative min-h-0 overflow-hidden bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.photos[1]!.imagePath}
                      alt={post.caption ?? "등록된 사진"}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="relative min-h-0 overflow-hidden bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.photos[2]!.imagePath}
                      alt={post.caption ?? "등록된 사진"}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              ) : post.photos.length === 1 ? (
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
                      <img
                        src={photo.imagePath}
                        alt={post.caption ?? "등록된 사진"}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid h-full grid-cols-2 grid-rows-2 gap-0.5">
                  {post.photos.map((photo) => (
                    <div key={photo.id} className="relative min-h-0 overflow-hidden bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.imagePath}
                        alt={post.caption ?? "등록된 사진"}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            {isPrivate && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/lock-private.png"
                  alt="비공개 게시물"
                  className="h-40 w-40 invert drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)] sm:h-48 sm:w-48"
                />
              </div>
            )}
          </div>
        </button>
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent
            className={[
              /* 높이는 크게, 가로는 상한으로 줄여 좌우 여백 과다 완화 */
              "flex max-h-[95dvh] w-full flex-col overflow-hidden p-1.5 sm:p-2",
              "max-w-none sm:max-w-none",
              /* 모바일: 화면에 거의 맞춤 / sm+: 최대 36rem(576px)로 패널 폭 제한 */
              "max-w-[calc(100vw-1rem)] sm:max-w-xl md:max-w-2xl",
              "overflow-y-auto",
            ].join(" ")}
            showCloseButton
          >
            <DialogHeader>
              <DialogTitle className="sr-only">게시물 상세</DialogTitle>
            </DialogHeader>
            <div className="flex min-h-0 flex-1 flex-col space-y-2 sm:space-y-3">
              <div className="grid grid-cols-3 items-center gap-3">
                <p className="min-w-0 text-xs text-muted-foreground">
                  {createdAt && !Number.isNaN(createdAt.getTime())
                    ? createdAt.toLocaleString("ko-KR", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                </p>
                {isOwnPost && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="col-start-2 justify-self-center"
                    onClick={() => {
                      setEditOpen(true);
                    }}
                  >
                    수정
                  </Button>
                )}
                <span className="col-start-3" aria-hidden />
              </div>
              <p className="shrink-0 text-sm font-medium text-foreground">
                {post.caption?.trim() || "제목 없음"}
              </p>
              {/* 이미지 영역: 남는 높이를 모두 사용, 화면 크기에 맞춰 자동 조절 */}
              <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center">
                {/* 이미지 옆에 배치해 겹침 최소화; 모바일은 좁은 세로 칼럼 */}
                <div className="flex w-full max-w-full items-center justify-center gap-1 sm:gap-2">
                  {totalPhotos > 1 && (
                    <div className="flex w-7 shrink-0 flex-col items-center justify-center sm:w-8">
                      {canGoPrev ? (
                        <button
                          type="button"
                          onClick={goPrev}
                          aria-label="이전 사진"
                          className="flex h-9 w-7 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-muted/80 hover:text-foreground sm:h-10 sm:w-8"
                        >
                          <ChevronLeft className="size-5 sm:size-6" strokeWidth={1.5} />
                        </button>
                      ) : (
                        <span className="h-9 w-7 sm:h-10 sm:w-8" aria-hidden />
                      )}
                    </div>
                  )}
                <div
                  className="flex min-h-0 min-w-0 flex-1 touch-pan-y select-none justify-center overflow-hidden"
                  onTouchStart={(e) => {
                    touchStartX.current =
                      e.changedTouches[0]?.clientX ?? e.touches[0]?.clientX ?? null;
                  }}
                  onTouchEnd={(e) => {
                    const start = touchStartX.current;
                    if (start == null || totalPhotos <= 1) return;
                    const end =
                      e.changedTouches[0]?.clientX ?? e.touches[0]?.clientX ?? start;
                    const delta = start - end;
                    if (delta > SWIPE_THRESHOLD_PX) goNext();
                    else if (delta < -SWIPE_THRESHOLD_PX) goPrev();
                    touchStartX.current = null;
                  }}
                >
                  {post.photos[photoIndex] && (
                    <div className="relative flex h-full w-full min-h-[40dvh] justify-center sm:min-h-[50dvh]">
                      <div className="flex h-full w-full justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={post.photos[photoIndex]!.imagePath}
                          alt={post.caption ?? "등록된 사진"}
                          className="h-full w-auto max-h-[min(88dvh,calc(95dvh-7rem))] max-w-full object-contain object-center"
                          draggable={false}
                        />
                      </div>
                    </div>
                  )}
                </div>
                  {totalPhotos > 1 && (
                    <div className="flex w-7 shrink-0 flex-col items-center justify-center sm:w-8">
                      {canGoNext ? (
                        <button
                          type="button"
                          onClick={goNext}
                          aria-label="다음 사진"
                          className="flex h-9 w-7 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-muted/80 hover:text-foreground sm:h-10 sm:w-8"
                        >
                          <ChevronRight className="size-5 sm:size-6" strokeWidth={1.5} />
                        </button>
                      ) : (
                        <span className="h-9 w-7 sm:h-10 sm:w-8" aria-hidden />
                      )}
                    </div>
                  )}
                </div>
                {totalPhotos > 1 && (
                  <p className="mt-2 rounded-full bg-muted/90 px-2 py-0.5 text-xs text-muted-foreground">
                    {photoIndex + 1} / {totalPhotos}
                  </p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {isOwnPost && (
          <Dialog
            open={editOpen}
            onOpenChange={(open) => {
              setEditOpen(open);
              if (!open) {
                setDeleting(false);
                setSaving(false);
              }
            }}
          >
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>게시물 설정</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-sm font-medium">공개유무</p>
                  <ToggleGroup
                    type="single"
                    value={visibility}
                    onValueChange={(v) => {
                      if (v === "public" || v === "private") setVisibility(v);
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    <ToggleGroupItem value="public" className="flex-1 justify-center">
                      공개
                    </ToggleGroupItem>
                    <ToggleGroupItem value="private" className="flex-1 justify-center">
                      비공개
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-sm font-medium text-destructive">삭제</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    삭제하면 되돌릴 수 없습니다.
                  </p>
                  <div className="mt-3">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="destructive"
                          className="w-full"
                          disabled={deleting}
                        >
                          {deleting ? "삭제 중…" : "게시물 삭제"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>게시물을 삭제할까요?</AlertDialogTitle>
                          <AlertDialogDescription>
                            이 작업은 되돌릴 수 없습니다.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={deleting}>
                            취소
                          </AlertDialogCancel>
                          <AlertDialogAction
                            variant="destructive"
                            disabled={deleting}
                            onClick={async () => {
                              if (deleting) return;
                              setDeleting(true);
                              try {
                                const res = await deleteOwnRiggerPost(
                                  riggerId,
                                  post.postId,
                                );
                                if (res.ok) {
                                  setEditOpen(false);
                                  setDetailOpen(false);
                                  router.refresh();
                                  return;
                                }
                                // 최소 UX: 모달은 유지하고 다시 시도 가능
                                alert(res.error);
                              } catch (e) {
                                const message =
                                  e instanceof Error ? e.message : String(e);
                                alert(
                                  `삭제 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.\n\n${message}`,
                                );
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
                {visibility !== initialVisibility && (
                  <Button
                    type="button"
                    className="w-full max-w-xs bg-blue-600 text-white hover:bg-blue-700"
                    disabled={saving || deleting}
                    onClick={async () => {
                      if (saving || deleting) return;
                      setSaving(true);
                      try {
                        const res = await updateOwnRiggerPostVisibility(
                          riggerId,
                          post.postId,
                          visibility,
                        );
                        if (!res.ok) {
                          alert(res.error);
                          return;
                        }
                        setEditOpen(false);
                        setDetailOpen(false);
                        router.push(
                          `/rigger/${encodeURIComponent(riggerId)}`,
                        );
                        router.refresh();
                      } catch (e) {
                        const message = e instanceof Error ? e.message : String(e);
                        alert(
                          `저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.\n\n${message}`,
                        );
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
        <div className="relative z-10 mt-2 shrink-0 border-t border-border/60 pt-2">
          <div className="flex items-start gap-6 pl-3 sm:pl-4">
            <div className="flex h-7 shrink-0 items-center">
              <PostLikeButton
                riggerId={riggerId}
                postId={post.postId}
                initialCount={like.count}
                initialLiked={like.liked}
                isOwnPost={post.photos[0]?.userId === sessionUserId}
              />
            </div>
            {post.photos[0] && (
              <PostCommentBlock
                riggerId={riggerId}
                photoId={post.photos[0].id}
                initialComments={initialComments}
              />
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

export function RiggerPostsFeed({
  riggerId,
  sessionUserId,
  initialPosts,
  initialLikeByPostId,
  initialCommentsByPhotoId,
  initialHasMore,
}: Props) {
  const [posts, setPosts] = useState<SerializedPost[]>(initialPosts);
  const [likeByPostId, setLikeByPostId] = useState(initialLikeByPostId);
  const [commentsByPhotoId, setCommentsByPhotoId] = useState(
    initialCommentsByPhotoId,
  );
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const offsetRef = useRef(initialPosts.length);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // 서버에서 initial* 값이 바뀌면 목록/좋아요/댓글/hasMore 상태를 초기화
  useEffect(() => {
    setPosts(initialPosts);
    setLikeByPostId(initialLikeByPostId);
    setCommentsByPhotoId(initialCommentsByPhotoId);
    setHasMore(initialHasMore);
    offsetRef.current = initialPosts.length;
  }, [
    initialPosts,
    initialLikeByPostId,
    initialCommentsByPhotoId,
    initialHasMore,
  ]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const result = await loadMoreRiggerPosts(
        riggerId,
        offsetRef.current,
        PAGE_SIZE,
        sessionUserId,
      );
      if (result.posts.length === 0) {
        setHasMore(false);
        return;
      }
      setPosts((prev) => [...prev, ...result.posts]);
      setLikeByPostId((prev) => ({ ...prev, ...result.likeByPostId }));
      setCommentsByPhotoId((prev) => ({ ...prev, ...result.commentsByPhotoId }));
      offsetRef.current += result.posts.length;
      setHasMore(result.hasMore);
    } finally {
      setLoading(false);
    }
  }, [riggerId, sessionUserId, loading, hasMore]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { root: null, rootMargin: "200px", threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loadMore]);

  return (
    <>
      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {posts.map((post) => (
          <PostCard
            key={post.postId}
            post={post}
            riggerId={riggerId}
            sessionUserId={sessionUserId}
            like={likeByPostId[post.postId] ?? { count: 0, liked: false }}
            initialComments={
              (post.photos[0]
                ? commentsByPhotoId[post.photos[0].id]
                : []) as React.ComponentProps<
                typeof PostCommentBlock
              >["initialComments"]
            }
          />
        ))}
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

