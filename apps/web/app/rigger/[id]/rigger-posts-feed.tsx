"use client";

import type React from "react";
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
import type { SerializedPost, SerializedPhotoRow } from "@/lib/rigger-posts-types";
import { PAGE_SIZE } from "@/lib/rigger-posts-constants";
import { loadMoreRiggerPosts } from "./post-feed-actions";
import { PostLikeButton } from "./post-like-button";
import { PostCommentBlock } from "./post-comment-block";
import { deleteOwnRiggerPost, updateOwnRiggerPostVisibility } from "./post-edit-actions";

/** 게시물 상세 다이얼로그 내 이미지 캐러셀 (2장 이상일 때만 사용) */
function PostDetailCarouselSlides({
  photos,
  caption,
}: {
  photos: SerializedPhotoRow[];
  caption: string | null;
}) {
  const { scrollPrev, scrollNext, canScrollPrev, canScrollNext, api } =
    useCarousel();
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!api) return;
    setSelectedIndex(api.selectedScrollSnap());
    const onSelect = () => setSelectedIndex(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
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
                    className="h-full w-auto max-h-[70dvh] max-w-full object-contain object-center"
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

type Props = {
  riggerId: string;
  sessionUserId: string;
  initialPosts: SerializedPost[];
  initialLikeByPostId: Record<string, { count: number; liked: boolean }>;
  initialCommentsByPhotoId: Record<string, unknown[]>;
  initialHasMore: boolean;
  /** 이 postId에 해당하는 게시물 상세 다이얼로그를 마운트 시 자동으로 연다 (예: ?postId=xxx) */
  initialOpenPostId?: string;
  /** 관리자가 다른 리거 게시물 전체 노출 시 사용 (비공개/승인대기 포함) */
  visibilityAsUserId?: string;
  /** 관리자 등 리거 권한으로 접근 시 게시물 수정/삭제 버튼 노출 */
  canEditPostsAsRigger?: boolean;
};

function PostCard({
  post,
  riggerId,
  sessionUserId,
  like,
  initialComments,
  openDetailInitially,
  canEditPostsAsRigger,
}: {
  post: SerializedPost;
  riggerId: string;
  sessionUserId: string;
  like: { count: number; liked: boolean };
  initialComments: React.ComponentProps<typeof PostCommentBlock>["initialComments"];
  openDetailInitially?: boolean;
  canEditPostsAsRigger?: boolean;
}) {
  const router = useRouter();
  const [detailOpen, setDetailOpen] = useState(!!openDetailInitially);
  const [editOpen, setEditOpen] = useState(false);
  const [visibility, setVisibility] = useState<"public" | "private" | "pending">(
    "public",
  );
  const [initialVisibility, setInitialVisibility] = useState<
    "public" | "private" | "pending"
  >("public");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [likeCount, setLikeCount] = useState(like.count);
  const [likedState, setLikedState] = useState(like.liked);

  useEffect(() => {
    setLikeCount(like.count);
    setLikedState(like.liked);
  }, [like.count, like.liked]);

  const createdAt = post.createdAt ? new Date(post.createdAt) : null;
  const totalPhotos = post.photos.length;
  const isOwnPost = post.photos[0]?.userId === sessionUserId;
  const canEditPost = isOwnPost || !!canEditPostsAsRigger;
  const postVisibility: "public" | "private" | "pending" =
    post.photos[0]?.visibility === "private"
      ? "private"
      : post.photos[0]?.visibility === "pending"
        ? "pending"
        : "public";
  const isPrivate = postVisibility === "private";
  const isPending = postVisibility === "pending";
  const approvals = post.bunnyApprovals ?? [];
  const approvalCount = approvals.length;
  const approvedCount = approvals.filter(
    (a) => a.status === "approved",
  ).length;
  const visibleBunnies = approvals.slice(0, 3);
  const extraBunnyCount = approvals.length - 3;
  const isRejected =
    isPending && approvals.some((a) => a.status === "rejected");
  const showPendingBunnyStatus =
    isPending && canEditPost && approvalCount > 0 && !isRejected;

  const openDetail = useCallback(() => {
    setDetailOpen(true);
  }, []);

  useEffect(() => {
    if (!editOpen) return;
    setVisibility(postVisibility);
    setInitialVisibility(postVisibility);
    setSaving(false);
  }, [editOpen, postVisibility]);

  return (
    <li className="min-w-0">
      <div className="relative flex flex-col overflow-visible rounded-2xl border border-border bg-card p-2 shadow-sm">
        <div className="flex items-center gap-1 flex-wrap min-w-0">
          <p className="shrink-0 text-[10px] text-muted-foreground">
            {createdAt && !Number.isNaN(createdAt.getTime())
              ? createdAt.toLocaleString("ko-KR", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : ""}
          </p>
          {visibleBunnies.map((b) => (
            <span
              key={b.email}
              className={[
                "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                b.status === "approved"
                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                  : b.status === "rejected"
                    ? "bg-red-500/10 text-red-600 dark:text-red-400"
                    : "bg-muted text-muted-foreground",
              ].join(" ")}
            >
              {b.name}
            </span>
          ))}
          {extraBunnyCount > 0 && (
            <span className="shrink-0 text-[10px] text-muted-foreground">
              외 {extraBunnyCount}명
            </span>
          )}
        </div>
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
            {isRejected ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/approve-reject-icon.png"
                  alt="승인 거절된 게시물"
                  className="h-32 w-auto max-w-[70%] opacity-95 drop-shadow-[0_2px_16px_rgba(0,0,0,0.85)] sm:h-40"
                />
              </div>
            ) : showPendingBunnyStatus ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative h-56 w-80 sm:h-64 sm:w-96">
                  <div className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 transform flex-col items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/approve-request-icon.png"
                      alt="버니 승인 요청 아이콘"
                      className="h-40 w-40 opacity-100 drop-shadow-[0_2px_18px_rgba(0,0,0,0.9)] brightness-0 invert sm:h-48 sm:w-48"
                    />
                    {approvalCount > 1 && (
                      <span className="rounded-full bg-black/85 px-3 py-1 text-center text-base font-bold leading-tight text-white drop-shadow-[0_1px_3px_rgba(0,0,0,1)] sm:text-lg">
                        {approvedCount} / {approvalCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              (isPrivate || isPending) && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={isPending ? "/approve-request-icon.png" : "/lock-private.png"}
                    alt={isPending ? "승인 대기중 게시물" : "비공개 게시물"}
                    className={
                      isPending
                        ? "h-[26rem] w-[26rem] opacity-100 drop-shadow-[0_2px_18px_rgba(0,0,0,0.9)] sm:h-128 sm:w-128 brightness-0 invert"
                        : "h-40 w-40 invert opacity-80 drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)] sm:h-48 sm:w-48"
                    }
                  />
                </div>
              )
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
              <DialogDescription className="sr-only">
                게시물 이미지와 제목, 수정·삭제 옵션이 표시됩니다.
              </DialogDescription>
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
                {canEditPost && (
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
              {/* 이미지 영역: 2장 이상이면 Carousel로 스와이프 */}
              <div className="relative flex min-h-0 flex-col items-center justify-center">
                {totalPhotos === 0 ? (
                  <div className="flex min-h-[40dvh] w-full items-center justify-center text-muted-foreground text-sm">
                    이미지 없음
                  </div>
                ) : totalPhotos === 1 ? (
                  <div className="relative flex w-full justify-center">
                    <div className="flex w-full justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={post.photos[0]!.imagePath}
                        alt={post.caption ?? "등록된 사진"}
                        className="w-auto max-h-[70dvh] max-w-full object-contain object-center"
                        draggable={false}
                      />
                    </div>
                    {isRejected && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/approve-reject-icon.png"
                          alt="승인 거절된 게시물"
                          className="h-40 w-auto max-w-[75%] opacity-95 drop-shadow-[0_3px_24px_rgba(0,0,0,0.85)] sm:h-52"
                        />
                      </div>
                    )}
                    {isPending && !isRejected && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/approve-request-icon.png"
                          alt="승인 대기중 게시물"
                          className="h-40 w-40 opacity-100 drop-shadow-[0_3px_20px_rgba(0,0,0,1)] brightness-0 invert sm:h-52 sm:w-52"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <Carousel
                    className="w-full"
                    opts={{ loop: false, align: "center" }}
                  >
                    <PostDetailCarouselSlides
                      photos={post.photos}
                      caption={post.caption}
                    />
                  </Carousel>
                )}
                {/* 승인 거절/대기 오버레이는 캐러셀 위에 동일 표시 */}
                {totalPhotos > 1 && isRejected && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/approve-reject-icon.png"
                      alt="승인 거절된 게시물"
                      className="h-40 w-auto max-w-[75%] opacity-95 drop-shadow-[0_3px_24px_rgba(0,0,0,0.85)] sm:h-52"
                    />
                  </div>
                )}
                {totalPhotos > 1 && isPending && !isRejected && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/approve-request-icon.png"
                      alt="승인 대기중 게시물"
                      className="h-40 w-40 opacity-100 drop-shadow-[0_3px_20px_rgba(0,0,0,1)] brightness-0 invert sm:h-52 sm:w-52"
                    />
                  </div>
                )}
              </div>
              {/* 다이얼로그 좋아요 */}
              <div className="shrink-0 border-t border-border/60 pt-2 flex justify-center">
                <PostLikeButton
                  riggerId={riggerId}
                  postId={post.postId}
                  initialCount={likeCount}
                  initialLiked={likedState}
                  isOwnPost={post.photos[0]?.userId === sessionUserId}
                  onToggle={(liked, count) => { setLikedState(liked); setLikeCount(count); }}
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {canEditPost && (
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
                <DialogDescription className="sr-only">
                  공개 유무 변경 및 게시물 삭제를 할 수 있습니다.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {postVisibility !== "pending" ? (
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
                      <ToggleGroupItem
                        value="private"
                        className="flex-1 justify-center"
                      >
                        비공개
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                ) : (
                  <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                    버니 승인 대기중인 게시물입니다. 승인 완료 전에는 공개/비공개를
                    변경할 수 없으며, 삭제만 가능합니다.
                  </div>
                )}

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
                {postVisibility !== "pending" && visibility !== initialVisibility && (
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
                          visibility === "pending" ? "private" : visibility,
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
                initialCount={likeCount}
                initialLiked={likedState}
                isOwnPost={post.photos[0]?.userId === sessionUserId}
                onToggle={(liked, count) => { setLikedState(liked); setLikeCount(count); }}
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
  initialOpenPostId,
  visibilityAsUserId,
  canEditPostsAsRigger,
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
        visibilityAsUserId,
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
  }, [riggerId, sessionUserId, visibilityAsUserId, loading, hasMore]);

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
            openDetailInitially={post.postId === initialOpenPostId}
            canEditPostsAsRigger={canEditPostsAsRigger}
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

