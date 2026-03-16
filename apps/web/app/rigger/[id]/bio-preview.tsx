"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { cn } from "@workspace/ui/lib/utils";

const DEFAULT_PREVIEW_MAX_HEIGHT_REM = 7.5;

type BioPreviewProps = {
  fullText: string;
  className?: string;
  /** 미리보기 최대 높이(rem). 기본 7.5. 버니 상세는 11(약 2줄 더) */
  previewMaxHeightRem?: number;
};

/**
 * 자기소개: 글 쓴 대로(pre-wrap).
 * 지정 높이 안에 다 들어가면 그대로만 표시(클릭/창 없음).
 * 넘치면 … 잘리고, 그때만 클릭 시 다이얼로그.
 */
export function BioPreview({
  fullText,
  className,
  previewMaxHeightRem = DEFAULT_PREVIEW_MAX_HEIGHT_REM,
}: BioPreviewProps) {
  const [open, setOpen] = useState(false);
  const [clamped, setClamped] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const trimmed = fullText?.trim() ?? "";
  const isEmpty = !trimmed || trimmed === "-";

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el || isEmpty) {
      setClamped(false);
      return;
    }
    setClamped(el.scrollHeight > el.clientHeight + 1);
  }, [trimmed, isEmpty]);

  if (isEmpty) {
    return (
      <p
        className={cn(
          "min-w-0 max-w-full text-base font-medium text-muted-foreground",
          className,
        )}
      >
        -
      </p>
    );
  }

  // 안 넘침: 박스 높이는 내용에 맞게( max-height만 상한 ), 클릭/다이얼로그 없음
  if (!clamped) {
    return (
      <div
        ref={boxRef}
        className={cn(
          "min-w-0 max-w-full overflow-hidden whitespace-pre-wrap break-words text-base font-medium text-foreground",
          className,
        )}
        style={{ maxHeight: `${previewMaxHeightRem}rem` }}
      >
        {trimmed}
      </div>
    );
  }

  // 넘침: 상한 고정 + … + 클릭 시 다이얼로그. 래퍼로 높이 고정해 폼이 늘어나지 않음
  return (
    <>
      <div
        className={cn("min-w-0 max-w-full overflow-hidden", className)}
        style={{ maxHeight: `${previewMaxHeightRem}rem` }}
      >
        <button
          type="button"
          className="relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-md text-left text-base font-medium text-foreground cursor-pointer hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{ maxHeight: `${previewMaxHeightRem}rem` }}
          onClick={() => setOpen(true)}
        >
          <div
            ref={boxRef}
            className="min-h-0 min-w-0 overflow-hidden whitespace-pre-wrap break-words pr-1"
            style={{ maxHeight: `${previewMaxHeightRem}rem` }}
          >
            {trimmed}
          </div>
          <span
            className="pointer-events-none absolute right-0 bottom-0 left-0 flex items-end justify-end bg-gradient-to-t from-card from-50% to-transparent pb-0.5 pl-4 pt-8"
            aria-hidden
          >
            <span className="shrink-0 text-base font-medium text-foreground">
              …
            </span>
          </span>
        </button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-h-[85vh] overflow-y-auto sm:max-w-lg"
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle>자기소개</DialogTitle>
            <DialogDescription className="sr-only">
              자기소개 전문을 확인할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <p className="whitespace-pre-wrap break-words text-base text-foreground">
            {trimmed}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
