"use client";

import { useEffect, useState } from "react";
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
import {
  approveBunnyPost,
  getPostDetailForApproval,
  rejectBunnyPost,
} from "./actions";
import type { BunnyApprovalItem } from "./bunny-approvals-list";

/** 승인 상세 다이얼로그 내 이미지 캐러셀 (2장 이상일 때만 사용) */
function ApprovalDetailCarouselSlides({
  photos,
  caption,
}: {
  photos: { imagePath: string }[];
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
              <CarouselItem key={photo.imagePath} className="pl-0">
                <div className="flex h-full w-full justify-center">
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
  const [processing, setProcessing] = useState(false);

  const postId = item?.postId ?? null;

  useEffect(() => {
    if (!open || !postId) {
      setPhotos([]);
      setCaption(null);
      setError(null);
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
      })
      .finally(() => setLoading(false));
  }, [open, postId]);

  const totalPhotos = photos.length;

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
          <DialogDescription className="sr-only">
            버니 승인 대기 게시물 상세 및 승인·거절 버튼이 표시됩니다.
          </DialogDescription>
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
                {totalPhotos === 1 ? (
                  <div className="relative flex h-full w-full min-h-[40dvh] justify-center sm:min-h-[50dvh]">
                    <img
                      src={photos[0]!.imagePath}
                      alt={caption ?? "등록된 사진"}
                      className="h-full w-auto max-h-[min(88dvh,calc(95dvh-7rem))] max-w-full object-contain object-center"
                      draggable={false}
                    />
                  </div>
                ) : (
                  <Carousel
                    className="w-full"
                    opts={{ loop: false, align: "center" }}
                  >
                    <ApprovalDetailCarouselSlides photos={photos} caption={caption} />
                  </Carousel>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
