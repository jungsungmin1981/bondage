"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImageIcon, Upload } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { cn } from "@workspace/ui/lib/utils";
import { updateChallengeStatusAction } from "./actions";
import type { ChallengeForReviewRow } from "@workspace/db";

async function uploadRejectionImage(file: File, challengeId: string): Promise<string> {
  const fd = new FormData();
  fd.set("file", file);
  fd.set("challengeId", challengeId);
  const res = await fetch("/api/uploads/challenge-rejection", { method: "POST", body: fd });
  const json = (await res.json()) as { ok: boolean; url?: string; error?: string };
  if (!json.ok || !json.url) {
    throw new Error(json.error ?? "이미지 업로드에 실패했습니다.");
  }
  return json.url;
}

function formatRelativeTime(d: Date): string {
  const now = Date.now();
  const then = new Date(d).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  if (diffSec < 60) return `${diffSec}초 전`;
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;
  return new Date(d).toLocaleDateString("ko-KR");
}

function StatusBadge({ status }: { status: string }) {
  if (status === "pending") {
    return (
      <span className="inline-flex items-center rounded-md border border-blue-600/30 bg-blue-50/50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:border-blue-500/30 dark:bg-blue-950/40 dark:text-blue-400">
        심사중
      </span>
    );
  }
  if (status === "approved") {
    return (
      <span className="inline-flex items-center rounded-md border border-green-600/30 bg-green-50/50 px-2 py-0.5 text-xs font-medium text-green-700 dark:border-green-500/30 dark:bg-green-950/40 dark:text-green-400">
        승인
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md border border-red-600/30 bg-red-50/50 px-2 py-0.5 text-xs font-medium text-red-700 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-400">
      반려
    </span>
  );
}

const isOptimizableUrl = (url: string) =>
  url.startsWith("https://") || url.startsWith("http://");

/** 클래스 메인(커버) 이미지 + 클래스명·로프 스팩 */
function ClassImageWithInfo({
  coverImageUrl,
  classTitle,
  ropeThicknessMm,
  ropeLengthM,
  quantity,
}: {
  coverImageUrl: string;
  classTitle: string;
  ropeThicknessMm: number;
  ropeLengthM: number;
  quantity: number;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2 text-center">
      {coverImageUrl && isOptimizableUrl(coverImageUrl) ? (
        <span className="relative flex size-16 shrink-0 overflow-hidden rounded-md bg-muted sm:size-20">
          <Image src={coverImageUrl} alt="" fill className="object-cover" sizes="80px" />
        </span>
      ) : (
        <span className="flex size-16 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground sm:size-20">
          <ImageIcon className="size-6 sm:size-7" aria-hidden />
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground text-xs sm:text-sm">{classTitle}</p>
        <p className="text-xs text-muted-foreground">
          {ropeThicknessMm}mm · {ropeLengthM}m · {quantity}개
        </p>
      </div>
    </div>
  );
}

/** 도전 등록 이미지 (1장만 표시) + 도전자 닉네임 */
function ChallengeImageCell({
  imageUrls,
  nickname,
}: {
  imageUrls: string[];
  nickname: string;
}) {
  const url = imageUrls[0];
  if (!url) {
    return (
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="text-xs text-muted-foreground">이미지 없음</span>
        <p className="truncate text-xs font-medium text-foreground">{nickname}</p>
      </div>
    );
  }

  const imageNode = isOptimizableUrl(url) ? (
    <span className="relative flex size-16 shrink-0 overflow-hidden rounded-md bg-muted sm:size-20">
      <Image src={url} alt="" fill className="object-cover" sizes="80px" />
    </span>
  ) : (
    <span className="relative flex size-16 shrink-0 overflow-hidden rounded-md bg-muted sm:size-20">
      <img src={url} alt="" className="size-full object-cover" />
    </span>
  );

  return (
    <div className="flex flex-col items-center gap-1 text-center">
      {imageNode}
      <p className="truncate text-xs font-medium text-foreground">{nickname}</p>
    </div>
  );
}

type ModalKind = "approve" | "reject" | null;

export function ClassReviewChallengeList({
  items,
  levelLabel = "초급",
  statusFilter,
}: {
  items: ChallengeForReviewRow[];
  levelLabel?: "초급" | "중급" | "고급";
  /** 승인 탭이면 '승인 / 반려' 머리글·열 숨김 */
  statusFilter?: "pending" | "approved" | "rejected";
}) {
  const showActionColumn = statusFilter !== "approved";
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [modal, setModal] = useState<{
    kind: ModalKind;
    row: ChallengeForReviewRow;
  } | null>(null);
  const [viewRejectionRow, setViewRejectionRow] =
    useState<ChallengeForReviewRow | null>(null);
  const [approveComment, setApproveComment] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const [rejectFiles, setRejectFiles] = useState<File[]>([]);
  const [rejectPreviewUrls, setRejectPreviewUrls] = useState<string[]>([]);

  useEffect(() => {
    if (rejectFiles.length === 0) {
      setRejectPreviewUrls([]);
      return;
    }
    const urls = rejectFiles.map((f) => URL.createObjectURL(f));
    setRejectPreviewUrls(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [rejectFiles]);

  function openApprove(row: ChallengeForReviewRow) {
    setModal({ kind: "approve", row });
    setApproveComment("");
  }

  function openReject(row: ChallengeForReviewRow) {
    setModal({ kind: "reject", row });
    setRejectNote("");
    setRejectFiles([]);
  }

  function closeModal() {
    setModal(null);
    setApproveComment("");
    setRejectNote("");
    setRejectFiles([]);
  }

  async function submitApprove() {
    if (!modal || modal.kind !== "approve") return;
    const { challengeId } = modal.row;
    setPendingId(challengeId);
    try {
      const result = await updateChallengeStatusAction(challengeId, "approved", {
        comment: approveComment.trim() || undefined,
      });
      if (result.ok) {
        closeModal();
        router.refresh();
      } else {
        alert(result.error);
      }
    } finally {
      setPendingId(null);
    }
  }

  async function submitReject() {
    if (!modal || modal.kind !== "reject") return;
    const note = rejectNote.trim();
    if (!note) {
      alert("반려 사유(설명)를 입력해주세요.");
      return;
    }
    const { challengeId } = modal.row;
    setPendingId(challengeId);
    try {
      const imageUrls: string[] = [];
      for (const file of rejectFiles) {
        const url = await uploadRejectionImage(file, challengeId);
        imageUrls.push(url);
      }
      const payload: Parameters<typeof updateChallengeStatusAction>[2] = {
        rejectionNote: note,
      };
      if (imageUrls.length > 0) payload.rejectionImageUrls = imageUrls;
      const result = await updateChallengeStatusAction(challengeId, "rejected", payload);
      if (result.ok) {
        closeModal();
        router.refresh();
      } else {
        alert(result.error);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "반려 처리에 실패했습니다.");
    } finally {
      setPendingId(null);
    }
  }

  const isPending = (id: string) => pendingId === id;

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        해당 레벨의 도전 신청이 없습니다.
      </p>
    );
  }

  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="w-28 pb-3 pr-4 text-center font-medium sm:w-36" scope="col">
              {levelLabel} 클래스
            </th>
            <th className="w-20 pb-3 pr-6 font-medium sm:w-28" scope="col">
              이미지
            </th>
            <th className="pb-3 pr-4 font-medium">신청일</th>
            <th className="pb-3 pr-4 font-medium">상태</th>
            <th className="pb-3 pr-4 font-medium">처리자</th>
            {showActionColumn && (
              <th className="pb-3 font-medium">
                {statusFilter === "rejected" ? "반려 사유" : "승인 / 반려"}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {items.map((row) => {
            const isRejectedClickable =
              row.status === "rejected" &&
              (row.rejectionNote != null ||
                (row.rejectionImageUrls?.length ?? 0) > 0);
            return (
            <tr
              key={row.challengeId}
              className={cn(
                "border-b",
                isRejectedClickable &&
                  "cursor-pointer transition-colors hover:bg-muted/50",
              )}
              role={isRejectedClickable ? "button" : undefined}
              onClick={
                isRejectedClickable
                  ? () => setViewRejectionRow(row)
                  : undefined
              }
            >
              <td className="py-5 pr-4 align-middle">
                <ClassImageWithInfo
                  coverImageUrl={row.coverImageUrl}
                  classTitle={row.classTitle}
                  ropeThicknessMm={row.ropeThicknessMm}
                  ropeLengthM={row.ropeLengthM}
                  quantity={row.quantity}
                />
              </td>
              <td className="py-5 pr-6 align-middle">
                <ChallengeImageCell
                  imageUrls={row.imageUrls}
                  nickname={row.challengerNickname}
                />
              </td>
              <td className="py-5 pr-4 align-middle">
                <span className="text-muted-foreground">
                  {formatRelativeTime(row.createdAt)}
                </span>
              </td>
              <td className="py-5 pr-4 align-middle">
                <StatusBadge status={row.status} />
              </td>
              <td className="py-5 pr-4 align-middle">
                {row.processorDecisions?.length ? (
                  <span className="flex flex-col flex-wrap gap-y-0.5">
                    {row.processorDecisions.map((p, i) => (
                      <span
                        key={i}
                        className={
                          p.decision === "approved"
                            ? "font-medium text-green-700 dark:text-green-400"
                            : "font-medium text-red-700 dark:text-red-400"
                        }
                      >
                        {p.nickname}
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              {showActionColumn && (
                <td className="py-5 align-middle" onClick={(e) => e.stopPropagation()}>
                  {row.status === "pending" ? (
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        size="sm"
                        disabled={isPending(row.challengeId)}
                        onClick={() => openApprove(row)}
                      >
                        {isPending(row.challengeId) ? "처리 중…" : "승인"}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={isPending(row.challengeId)}
                        onClick={() => openReject(row)}
                      >
                        반려
                      </Button>
                    </div>
                  ) : row.status === "rejected" && isRejectedClickable ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setViewRejectionRow(row)}
                    >
                      반려 내용 보기
                    </Button>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              )}
            </tr>
          );
          })}
        </tbody>
      </table>

      {/* 승인 모달: 코멘트 (선택) */}
      <Dialog open={modal?.kind === "approve"} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>승인</DialogTitle>
            <DialogDescription>
              도전을 승인합니다. 리거에게 전달할 코멘트를 입력할 수 있습니다 (선택).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="approve-comment">코멘트 (선택)</Label>
            <Textarea
              id="approve-comment"
              placeholder="예: 마무리 깔끔합니다."
              value={approveComment}
              onChange={(e) => setApproveComment(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={closeModal}>
              취소
            </Button>
            <Button type="button" onClick={submitApprove} disabled={!!pendingId}>
              승인하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 반려 내용 보기 모달 (목록에서 클릭 시) */}
      <Dialog
        open={!!viewRejectionRow}
        onOpenChange={(open) => !open && setViewRejectionRow(null)}
      >
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>반려 내용</DialogTitle>
            {viewRejectionRow && (
              <DialogDescription asChild>
                <span>{viewRejectionRow.classTitle}</span>
              </DialogDescription>
            )}
          </DialogHeader>
          {viewRejectionRow && (
            <div className="space-y-4 py-2">
              {viewRejectionRow.rejectionNote != null &&
              viewRejectionRow.rejectionNote.trim() !== "" ? (
                <div className="rounded-md border bg-muted/30 p-3">
                  <p className="whitespace-pre-wrap break-words text-sm text-foreground">
                    {viewRejectionRow.rejectionNote}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">반려 사유 없음</p>
              )}
              {(viewRejectionRow.rejectionImageUrls?.length ?? 0) > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    참고 이미지
                  </p>
                  <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {viewRejectionRow.rejectionImageUrls!.map((url, i) => (
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
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 반려 모달: 사유(설명) + 이미지 업로드 */}
      <Dialog open={modal?.kind === "reject"} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>반려</DialogTitle>
            <DialogDescription>
              도전을 반려합니다. 반려 사유와 참고 이미지를 입력해주세요.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="reject-note">반려 사유 (설명) *</Label>
              <Textarea
                id="reject-note"
                placeholder="예: 포인트가 기준과 다릅니다. 참고 이미지를 확인해 주세요."
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
            <div className="grid gap-2">
              <Label>참고 이미지 (선택)</Label>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent">
                  <Upload className="h-4 w-4 shrink-0" aria-hidden />
                  <span>이미지 선택</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={(e) => {
                      const files = e.target.files ? Array.from(e.target.files) : [];
                      setRejectFiles((prev) => [...prev, ...files]);
                    }}
                  />
                </label>
                {rejectPreviewUrls.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {rejectPreviewUrls.map((url, i) => (
                      <span
                        key={url}
                        className="relative flex size-14 shrink-0 overflow-hidden rounded border bg-muted"
                      >
                        <img src={url} alt="" className="size-full object-cover" />
                        <button
                          type="button"
                          className="absolute right-0 top-0 rounded-bl bg-black/60 p-0.5 text-white"
                          aria-label="제거"
                          onClick={() =>
                            setRejectFiles((prev) => prev.filter((_, j) => j !== i))
                          }
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={closeModal}>
              취소
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void submitReject()}
              disabled={!!pendingId || !rejectNote.trim()}
            >
              {pendingId ? "처리 중…" : "반려하기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
