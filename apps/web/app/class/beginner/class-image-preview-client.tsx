"use client";

import type { FormEvent } from "react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { getMyChallengeForClassPostAction } from "@/app/class/actions";
import type { ClassCard as ClassCardType } from "./data";
import { ClassCard } from "./class-card";

type Props = {
  cards: ClassCardType[];
};

export function ClassImagePreviewClient({ cards }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<ClassCardType | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [myChallengeStatus, setMyChallengeStatus] = useState<
    "pending" | "approved" | "rejected" | null
  >(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!active?.id) {
      setMyChallengeStatus(null);
      return;
    }
    setMyChallengeStatus(active.myChallengeStatus ?? null);
    let cancelled = false;
    getMyChallengeForClassPostAction(active.id).then((res) => {
      if (!cancelled) setMyChallengeStatus(res.status);
    });
    return () => {
      cancelled = true;
    };
  }, [active?.id, active?.myChallengeStatus]);

  const onChallengeSuccess = useCallback(() => {
    setMyChallengeStatus("pending");
  }, []);

  const previewPhotos =
    active != null
      ? [
          active.imageUrl?.trim() || null,
          ...(active.extraImageUrls ?? []),
        ].filter((v): v is string => !!v)
      : [];

  const canPrev = previewPhotos.length > 1 && photoIndex > 0;
  const canNext = previewPhotos.length > 1 && photoIndex < previewPhotos.length - 1;

  const openDetail = (card: ClassCardType) => {
    setActive(card);
    setPhotoIndex(0);
    setOpen(true);
  };

  const goPrev = () => {
    if (canPrev) setPhotoIndex((i) => i - 1);
  };

  const goNext = () => {
    if (canNext) setPhotoIndex((i) => i + 1);
  };

  return (
    <>
      <section
        className="mt-6 grid gap-6 sm:gap-8 sm:grid-cols-2"
        aria-label="초급 클래스 카드 목록"
      >
        {cards.map((card) => (
          <ClassCard
            key={card.id}
            card={card}
            levelLabel="초급"
            onImageClick={() => openDetail(card)}
          />
        ))}
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="flex max-h-[95dvh] w-full flex-col overflow-hidden p-1.5 sm:p-2 max-w-[calc(100vw-1rem)] sm:max-w-xl md:max-w-2xl overflow-y-auto"
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle className="sr-only">이미지 상세보기</DialogTitle>
            <DialogDescription className="sr-only">
              클래스 이미지와 로프 스펙, 도전하기 버튼이 표시됩니다.
            </DialogDescription>
          </DialogHeader>

          {active && (
            <div className="flex min-h-0 flex-1 flex-col space-y-2 sm:space-y-3">
              {/* 대표/추가 이미지 슬라이드 */}
              <div className="relative flex flex-col items-center justify-center">
                <div className="flex w-full max-w-full items-center justify-center gap-1 sm:gap-2">
                  {previewPhotos.length > 1 && (
                    <div className="flex w-7 shrink-0 flex-col items-center justify-center sm:w-8">
                      {canPrev ? (
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
                      if (start == null || previewPhotos.length <= 1) return;
                      const end =
                        e.changedTouches[0]?.clientX ?? e.touches[0]?.clientX ?? start;
                      const delta = start - end;
                      if (delta > 50) goNext();
                      else if (delta < -50) goPrev();
                      touchStartX.current = null;
                    }}
                  >
                    {previewPhotos[photoIndex] ? (
                      <div className="relative flex w-full justify-center">
                        <div className="flex w-full justify-center">
                          {previewPhotos[photoIndex]!.startsWith("blob:") ? (
                            <img
                              src={previewPhotos[photoIndex]!}
                              alt=""
                              className="h-auto w-full max-h-[50dvh] object-contain object-center"
                              draggable={false}
                            />
                          ) : (
                            <Image
                              src={previewPhotos[photoIndex]!}
                              alt=""
                              width={800}
                              height={600}
                              className="h-auto w-full max-h-[50dvh] object-contain object-center"
                              sizes="(max-width: 768px) 100vw, 800px"
                              draggable={false}
                            />
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-56 w-full items-center justify-center text-muted-foreground">
                        <span className="text-sm">이미지 없음</span>
                      </div>
                    )}
                  </div>

                  {previewPhotos.length > 1 && (
                    <div className="flex w-7 shrink-0 flex-col items-center justify-center sm:w-8">
                      {canNext ? (
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

                {previewPhotos.length > 1 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {photoIndex + 1} / {previewPhotos.length}
                  </p>
                )}
              </div>

              {/* 로프 스펙 + 도전 아이콘 카드 (있을 때만) */}
              {active.ropeThicknessMm != null &&
                active.ropeLengthM != null &&
                active.quantity != null && (
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    {/* 로프 스펙 카드 */}
                    <div className="flex items-center justify-center rounded-xl border border-border bg-card px-3 py-1">
                      <p className="text-xs text-foreground text-center sm:text-sm">
                        두께{" "}
                        <span className="font-semibold">{active.ropeThicknessMm}mm</span>
                        <span className="mx-1 text-muted-foreground">·</span>
                        길이{" "}
                        <span className="font-semibold">{active.ropeLengthM}m</span>
                        <span className="mx-1 text-muted-foreground">·</span>
                        수량{" "}
                        <span className="font-semibold">{active.quantity}개</span>
                      </p>
                    </div>

                    {/* 도전 아이콘 버튼 카드 */}
                    <div className="flex items-center justify-center rounded-xl border border-border bg-card px-3 py-1">
                      {myChallengeStatus === "pending" ? (
                        <span
                          className="flex items-center justify-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300 sm:text-sm"
                          aria-label="심사중"
                        >
                          <Clock className="h-4 w-4 shrink-0 sm:h-4 sm:w-4" strokeWidth={2} />
                          심사중
                        </span>
                      ) : myChallengeStatus === "approved" ? (
                        <span
                          className="flex items-center justify-center gap-2 rounded-lg border border-green-600/30 bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-700 dark:border-green-500/30 dark:bg-green-400/10 dark:text-green-300 sm:text-sm"
                          aria-label="완료"
                        >
                          <CheckCircle className="h-4 w-4 shrink-0 sm:h-4 sm:w-4" strokeWidth={2} />
                          완료
                        </span>
                      ) : (
                        <button
                          type="button"
                          aria-label="도전"
                          onClick={() => setChallengeOpen(true)}
                          className="flex items-center justify-center gap-1.5 rounded-md bg-foreground px-2 py-0.5 text-background hover:opacity-90"
                        >
                          <img
                            src="/icons/challenge-arrow.png"
                            alt="도전"
                            className="h-6 w-6 sm:h-7 sm:w-7 [filter:brightness(0)_saturate(100%)_invert(27%)_sepia(98%)_saturate(5000%)_hue-rotate(350deg)]"
                            draggable={false}
                          />
                          <span className="text-xs font-semibold sm:text-sm">
                            도전 하기
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

              {/* 도전 통계 */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {(() => {
                  const approved = active.challengeApprovedCount ?? 0;
                  const pending = active.challengePendingCount ?? 0;
                  const rejected = active.challengeRejectedCount ?? 0;
                  if (approved === 0 && pending === 0) {
                    return (
                      <span className="inline-flex items-center rounded-md border border-emerald-600/30 bg-emerald-50/50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-400">
                        첫 클리어에 도전하세요!
                      </span>
                    );
                  }
                  return (
                    <>
                      <span className="inline-flex items-center rounded-md border border-green-600/30 bg-green-50/50 px-2 py-0.5 text-xs font-medium text-green-700 dark:border-green-500/30 dark:bg-green-950/40 dark:text-green-400">
                        성공 {approved}
                      </span>
                      {pending > 0 && (
                        <span className="inline-flex items-center rounded-md border border-blue-600/30 bg-blue-50/50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:border-blue-500/30 dark:bg-blue-950/40 dark:text-blue-400">
                          심사중 {pending}
                        </span>
                      )}
                      {rejected > 0 && (
                        <span className="inline-flex items-center rounded-md border border-red-600/30 bg-red-50/50 px-2 py-0.5 text-xs font-medium text-red-700 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-400">
                          실패 {rejected}
                        </span>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* 설명 구역 */}
              {active.description?.trim() && (
                <div className="mt-2 max-h-[30dvh] overflow-y-auto rounded-xl border border-border bg-card p-4">
                  <p className="text-sm font-medium text-foreground">설명</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                    {active.description}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {active && mounted && (
        <ClassChallengeDialog
          open={challengeOpen}
          onOpenChange={setChallengeOpen}
          classPostId={active.id}
          classTitle={active.title}
          onSuccess={onChallengeSuccess}
        />
      )}
    </>
  );
}

type ClassChallengeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classPostId: string;
  classTitle: string;
  onSuccess: () => void;
};

async function uploadChallengeImage(file: File, classPostId: string): Promise<string> {
  const fd = new FormData();
  fd.set("file", file);
  fd.set("classPostId", classPostId);
  const res = await fetch("/api/uploads/challenge", { method: "POST", body: fd });
  const json = (await res.json()) as { ok: boolean; url?: string; error?: string };
  if (!json.ok || !json.url) {
    throw new Error(json.error ?? "이미지 업로드에 실패했습니다.");
  }
  return json.url;
}

function ClassChallengeDialog({
  open,
  onOpenChange,
  classPostId,
  classTitle,
  onSuccess,
}: ClassChallengeDialogProps) {
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (files.length === 0) {
      setPreviewUrls([]);
      return;
    }
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviewUrls(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [files]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!note.trim()) {
      alert("메모를 입력해주세요.");
      return;
    }
    if (files.length === 0) {
      alert("이미지를 1장 이상 등록해주세요.");
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      const imageUrls: string[] = [];
      for (const file of files) {
        const url = await uploadChallengeImage(file, classPostId);
        imageUrls.push(url);
      }
      const { createClassChallengeAction } = await import("@/app/class/actions");
      const result = await createClassChallengeAction({
        classPostId,
        note: note.trim(),
        imageUrls,
      });
      if (!result.ok) {
        alert(result.error);
        return;
      }
      setNote("");
      setFiles([]);
      alert("도전 신청이 접수되었습니다.");
      onSuccess();
      handleClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : "도전 신청에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] w-full flex-col overflow-y-auto p-4 sm:p-5 max-w-[calc(100vw-1rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">
            도전 신청하기
          </DialogTitle>
          <DialogDescription className="sr-only">
            메모와 이미지를 입력한 뒤 도전 신청을 보낼 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          <div className="rounded-lg bg-muted/40 px-3 py-2.5 text-xs sm:text-sm text-muted-foreground">
            <p>
              이미지를 등록하시면 운영진이 확인 후 처리합니다.
            </p>
            <p className="mt-1">정면, 측면, 후면 사진을 등록해 주세요.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="challenge-note">
              메모 <span className="text-red-600">*</span>
            </Label>
            <Textarea
              id="challenge-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={300}
              placeholder="남기고 싶은 메모를 자유롭게 적어 주세요. (최대 300자)"
              className="min-h-24"
            />
            <p className="text-right text-xs text-muted-foreground">
              {note.length}/300
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="challenge-files">파일 첨부</Label>
            <input
              id="challenge-files"
              type="file"
              accept="image/*"
              multiple
              className="block w-full text-xs sm:text-sm file:mr-3 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-xs file:font-medium hover:file:bg-muted"
              onChange={(e) => {
                const selected = Array.from(e.target.files ?? []);
                if (selected.length === 0) return;

                const MAX_FILES = 3;
                const combined = [...files, ...selected];
                const limited = combined.slice(0, MAX_FILES);

                setFiles(limited);
                e.target.value = "";
              }}
            />
            {files.length > 0 ? (
              <div className="rounded-md border border-dashed border-border bg-muted/30 p-2">
                <div className="grid grid-cols-3 gap-2">
                  {previewUrls.map((url, i) => (
                    <div
                      key={files[i]?.name ?? i}
                      className="relative aspect-square overflow-hidden rounded-md border border-border bg-background"
                    >
                      <img src={url} alt={files[i]?.name ?? ""} className="size-full object-cover" />
                    </div>
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  선택한 이미지가 작게 표시됩니다. (최대 3장)
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                정면 / 측면 / 후면 기준으로 최대 3장까지 이미지를 등록할 수 있습니다.
              </p>
            )}
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={submitting}
            >
              취소
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "전송 중..." : "도전 신청 보내기"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

