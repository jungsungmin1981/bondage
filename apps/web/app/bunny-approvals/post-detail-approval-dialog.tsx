"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import {
  approveBunnyPost,
  getPostDetailForApproval,
  rejectBunnyPost,
} from "./actions";
import type { BunnyApprovalItem } from "./bunny-approvals-list";

type Props = {
  open: boolean;
  item: BunnyApprovalItem | null;
  onClose: () => void;
  onProcessed?: () => void;
};

export function PostDetailApprovalDialog({
  open,
  item,
  onClose,
  onProcessed,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<{ imagePath: string }[]>([]);
  const [caption, setCaption] = useState<string | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [processing, setProcessing] = useState(false);

  const postId = item?.postId ?? null;

  useEffect(() => {
    if (!open || !postId) {
      setPhotos([]);
      setCaption(null);
      setError(null);
      setPhotoIndex(0);
      return;
    }
    setLoading(true);
    setError(null);
    getPostDetailForApproval(postId)
      .then((res) => {
        if (!res.ok) {
          setError(res.error);
          setPhotos([]);
          setCaption(null);
          return;
        }
        setPhotos(res.photos);
        setCaption(res.caption);
        setPhotoIndex(0);
      })
      .finally(() => setLoading(false));
  }, [open, postId]);

  const totalPhotos = photos.length;
  const canGoPrev = totalPhotos > 1 && photoIndex > 0;
  const canGoNext = totalPhotos > 1 && photoIndex < totalPhotos - 1;
  const goPrev = useCallback(() => {
    if (canGoPrev) setPhotoIndex((i) => i - 1);
  }, [canGoPrev]);
  const goNext = useCallback(() => {
    if (canGoNext) setPhotoIndex((i) => i + 1);
  }, [canGoNext]);

  const handleApprove = async () => {
    if (!item || item.status !== "pending" || processing) return;
    setProcessing(true);
    const result = await approveBunnyPost(item.approvalId);
    setProcessing(false);
    if (result.ok) {
      onProcessed?.();
    }
  };

  const handleReject = async () => {
    if (!item || item.status !== "pending" || processing) return;
    setProcessing(true);
    const result = await rejectBunnyPost(item.approvalId);
    setProcessing(false);
    if (result.ok) {
      onProcessed?.();
    }
  };

  const isPending = item?.status === "pending";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className={[
          "flex max-h-[95dvh] w-full flex-col overflow-hidden p-1.5 sm:p-2",
          "max-w-none sm:max-w-none",
          "max-w-[calc(100vw-1rem)] sm:max-w-xl md:max-w-2xl",
          "overflow-y-auto",
        ].join(" ")}
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle className="sr-only">게시물 상세</DialogTitle>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col space-y-2 sm:space-y-3">
          {isPending && (
            <div className="flex justify-center gap-2">
              <Button
                size="sm"
                variant="default"
                disabled={processing}
                onClick={handleApprove}
              >
                {processing ? "처리 중…" : "승인"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={processing}
                onClick={handleReject}
              >
                거절
              </Button>
            </div>
          )}
          {loading && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              불러오는 중…
            </p>
          )}
          {error && !loading && (
            <p className="py-4 text-center text-sm text-destructive">{error}</p>
          )}
          {!loading && !error && photos.length > 0 && (
            <>
              <p className="shrink-0 text-sm font-medium text-foreground">
                {caption?.trim() || "제목 없음"}
              </p>
              <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center">
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
                          <ChevronLeft
                            className="size-5 sm:size-6"
                            strokeWidth={1.5}
                          />
                        </button>
                      ) : (
                        <span className="h-9 w-7 sm:h-10 sm:w-8" aria-hidden />
                      )}
                    </div>
                  )}
                  <div className="flex min-h-0 min-w-0 flex-1 justify-center overflow-hidden">
                    <div className="relative flex h-full w-full min-h-[40dvh] justify-center sm:min-h-[50dvh]">
                      <img
                        src={photos[photoIndex]!.imagePath}
                        alt={caption ?? "등록된 사진"}
                        className="h-full w-auto max-h-[min(88dvh,calc(95dvh-7rem))] max-w-full object-contain object-center"
                        draggable={false}
                      />
                    </div>
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
                          <ChevronRight
                            className="size-5 sm:size-6"
                            strokeWidth={1.5}
                          />
                        </button>
                      ) : (
                        <span className="h-9 w-7 sm:h-10 sm:w-8" aria-hidden />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
