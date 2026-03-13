"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { cn } from "@workspace/ui/lib/utils";

const PREVIEW_MAX_HEIGHT_REM = 7.5;

type BioPreviewProps = {
  fullText: string;
  className?: string;
};

/**
 * 자기소개: 글 쓴 대로(pre-wrap).
 * 9rem 안에 다 들어가면 그대로만 표시(클릭/창 없음).
 * 넘치면 … 잘리고, 그때만 클릭 시 다이얼로그.
 */
export function BioPreview({ fullText, className }: BioPreviewProps) {
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
          "min-w-0 max-w-full text-lg font-medium text-muted-foreground",
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
          "min-w-0 max-w-full max-h-[7.5rem] overflow-hidden whitespace-pre-wrap break-words text-lg font-medium text-foreground",
          className,
        )}
      >
        {trimmed}
      </div>
    );
  }

  // 넘침: 상한 고정 + … + 클릭 시 다이얼로그만
  return (
    <>
      <button
        type="button"
        className={cn(
          "relative min-w-0 max-w-full w-full overflow-hidden rounded-md text-left text-lg font-medium text-foreground",
          "cursor-pointer hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
        style={{ maxHeight: `${PREVIEW_MAX_HEIGHT_REM}rem` }}
        onClick={() => setOpen(true)}
      >
        <div
          ref={boxRef}
          className="max-h-full overflow-hidden whitespace-pre-wrap break-words pr-1"
          style={{ maxHeight: `${PREVIEW_MAX_HEIGHT_REM}rem` }}
        >
          {trimmed}
        </div>
        <span
          className="pointer-events-none absolute right-0 bottom-0 left-0 flex items-end justify-end bg-gradient-to-t from-card from-50% to-transparent pb-0.5 pl-4 pt-8"
          aria-hidden
        >
          <span className="shrink-0 text-lg font-medium text-foreground">
            …
          </span>
        </span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-h-[85vh] overflow-y-auto sm:max-w-lg"
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle>자기소개</DialogTitle>
          </DialogHeader>
          <p className="whitespace-pre-wrap break-words text-base text-foreground">
            {trimmed}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
