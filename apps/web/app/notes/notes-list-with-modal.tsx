"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { getDirectMessageSourceLabel } from "@/lib/direct-message-source-labels";
import { deleteNoteAction, markNoteAsReadAction } from "./actions";

export type NoteInList = {
  id: string;
  title: string | null;
  body: string;
  source: string | null;
  imageUrls: string[];
  /** 클래스 도전 반려 시 해당 게시물 레벨 (beginner/intermediate/advanced) */
  classPostLevel: string | null;
  /** 클래스 도전 반려 시 해당 게시물 제목 */
  classPostTitle: string | null;
  readAt: Date | string | null;
  createdAt: Date | string;
};

function formatDate(d: Date | string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(typeof d === "string" ? new Date(d) : d);
}

const CLASS_LEVEL_LABELS: Record<string, string> = {
  beginner: "초급",
  intermediate: "중급",
  advanced: "고급",
};

function getClassLevelLabel(level: string | null): string {
  return level ? CLASS_LEVEL_LABELS[level] ?? level : "";
}

/** 계정 사용 제한 쪽지 본문에서 "정지 기간: ..." 추출 */
function getSuspensionPeriodFromBody(body: string): string | null {
  const match = body.match(/정지\s*기간:\s*(.+)/);
  return match?.[1] != null ? match[1].trim() || null : null;
}

function displayTitle(
  title: string | null,
  body: string,
  opts?: { classPostLevel: string | null; classPostTitle: string | null; source: string | null },
): string {
  if (opts?.source === "class_challenge_rejection" && (opts.classPostLevel || opts.classPostTitle)) {
    const levelLabel = getClassLevelLabel(opts.classPostLevel);
    const postTitle = opts.classPostTitle?.trim() ?? "";
    return [levelLabel, postTitle].filter(Boolean).join(" · ") || "(제목 없음)";
  }
  if (title?.trim()) return title.trim();
  const firstLine = body.split("\n")[0]?.trim();
  return firstLine || "(제목 없음)";
}

export function NotesListWithModal({ messages }: { messages: NoteInList[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [modalNote, setModalNote] = useState<NoteInList | null>(null);

  const openModal = (msg: NoteInList) => {
    setModalNote(msg);
    markNoteAsReadAction(msg.id);
  };

  const closeModal = () => setModalNote(null);

  const handleDelete = () => {
    if (!modalNote) return;
    startTransition(async () => {
      const result = await deleteNoteAction(modalNote.id);
      if (result.ok) {
        closeModal();
        router.refresh();
      }
    });
  };

  return (
    <>
      <ul className="mt-6 space-y-1">
        {messages.map((msg) => {
          const sourceLabel = getDirectMessageSourceLabel(msg.source);
          const suspensionPeriod =
            msg.source === "suspension_notice"
              ? getSuspensionPeriodFromBody(msg.body)
              : null;
          return (
            <li key={msg.id}>
              <button
                type="button"
                onClick={() => openModal(msg)}
                className="flex min-h-[44px] w-full items-center gap-3 rounded-lg border bg-card px-4 py-3 text-left transition-colors hover:bg-muted/50 sm:gap-4"
              >
                {sourceLabel !== "쪽지" && (
                  <span
                    className={
                      sourceLabel === "리거 승인 반려" ||
                      sourceLabel === "게시물 승인 거절"
                        ? "shrink-0 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950/60 dark:text-red-300"
                        : sourceLabel === "클래스 도전 반려"
                          ? "shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                          : sourceLabel === "계정 사용 제한"
                            ? "shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                            : "shrink-0 text-xs text-muted-foreground"
                    }
                  >
                    {sourceLabel}
                  </span>
                )}
                {suspensionPeriod && (
                  <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-200">
                    {suspensionPeriod}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                  {displayTitle(msg.title, msg.body, {
                    source: msg.source,
                    classPostLevel: msg.classPostLevel,
                    classPostTitle: msg.classPostTitle,
                  })}
                </span>
                <span
                  className="shrink-0 text-xs text-muted-foreground"
                  suppressHydrationWarning
                >
                  {formatDate(msg.createdAt)}
                </span>
                {msg.readAt == null && (
                  <span
                    className="h-2 w-2 shrink-0 rounded-full bg-primary"
                    aria-label="읽지 않음"
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <Dialog open={!!modalNote} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent
          className="flex max-h-[90dvh] max-w-lg flex-col overflow-hidden sm:max-w-lg"
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {modalNote
                ? displayTitle(modalNote.title, modalNote.body, {
                    source: modalNote.source,
                    classPostLevel: modalNote.classPostLevel,
                    classPostTitle: modalNote.classPostTitle,
                  })
                : ""}
            </DialogTitle>
            <DialogDescription className="sr-only">
              쪽지 내용과 참고 이미지를 확인할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          {modalNote && (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap break-words text-sm text-foreground">
                {modalNote.body}
              </div>
              {modalNote.imageUrls && modalNote.imageUrls.length > 0 && (
                <div className="mt-3 border-t pt-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    참고 이미지
                  </p>
                  <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {modalNote.imageUrls.map((url, i) => (
                      <li
                        key={i}
                        className="relative aspect-square overflow-hidden rounded-lg border bg-muted"
                      >
                        <img
                          src={url}
                          alt={`참고 이미지 ${i + 1}`}
                          className="size-full object-cover"
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex shrink-0 justify-end border-t pt-4">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={pending}
                >
                  {pending ? "삭제 중…" : "삭제"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
