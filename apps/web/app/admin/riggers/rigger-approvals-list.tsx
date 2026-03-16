"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserCircle } from "lucide-react";
import { approveRiggerProfileAction, rejectRiggerProfileWithNoteAction } from "./actions";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import type { PendingRiggerProfileRow } from "@workspace/db";

export type RiggerApprovalListItem = PendingRiggerProfileRow & {
  markImageUrl?: string | null;
};

export type ReRequestedApprovalListItem = RiggerApprovalListItem & {
  reRequestedAt: Date | null;
};

function formatTime(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("ko-KR");
}

function formatRelativeTime(d: Date | null): string {
  if (!d) return "—";
  const now = Date.now();
  const then = new Date(d).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 10) return "방금";
  if (diffSec < 60) return `${diffSec}초 전`;
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;
  return formatTime(d);
}

export function RiggerApprovalsList({
  items,
  reRequestedItems = [],
  rejectedItems = [],
}: {
  items: RiggerApprovalListItem[];
  reRequestedItems?: ReRequestedApprovalListItem[];
  rejectedItems?: RiggerApprovalListItem[];
}) {
  const [hasMounted, setHasMounted] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<RiggerApprovalListItem | null>(null);
  const [rejectTitle, setRejectTitle] = useState("");
  const [rejectContent, setRejectContent] = useState("");
  const [pendingRejectId, setPendingRejectId] = useState<string | null>(null);
  const [viewMessageModal, setViewMessageModal] = useState<RiggerApprovalListItem | null>(null);
  const router = useRouter();

  useEffect(() => setHasMounted(true), []);

  function handleApprove(profileId: string) {
    setPendingId(profileId);
    approveRiggerProfileAction(profileId).then((result) => {
      setPendingId(null);
      if (result.ok) router.refresh();
      else if (!result.ok) alert(result.error);
    });
  }

  function openReject(row: RiggerApprovalListItem) {
    setRejectModal(row);
    setRejectTitle("");
    setRejectContent("");
  }

  function closeRejectModal() {
    setRejectModal(null);
    setRejectTitle("");
    setRejectContent("");
  }

  async function submitReject() {
    if (!rejectModal) return;
    const title = rejectTitle.trim();
    const content = rejectContent.trim();
    if (!content) {
      alert("쪽지 내용을 입력해 주세요.");
      return;
    }
    setPendingRejectId(rejectModal.id);
    try {
      const result = await rejectRiggerProfileWithNoteAction(
        rejectModal.id,
        title,
        content,
      );
      if (result.ok) {
        closeRejectModal();
        router.refresh();
      } else {
        alert(result.error);
      }
    } finally {
      setPendingRejectId(null);
    }
  }

  return (
    <div className="mt-6 space-y-8">
      {/* 승인 요청 목록 */}
      <div className="overflow-x-auto">
        {items.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            현재 대기 중인 리거가 없습니다.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="w-14 pb-2 pr-3 text-center font-medium" scope="col">
                  <span className="sr-only">회원마크</span>
                  <UserCircle className="inline-block size-5 text-muted-foreground" aria-hidden />
                </th>
                <th className="pb-2 pr-4 font-medium">닉네임</th>
                <th className="pb-2 pr-4 font-medium">요청일</th>
                <th className="pb-2 font-medium">승인 / 반려</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
            <tr key={row.id} className="border-b">
              <td className="py-3 pr-3 align-middle">
                <Link
                  href={`/rigger/${encodeURIComponent(row.id)}`}
                  className="inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full"
                  aria-label={`${row.nickname} 회원 상세 보기`}
                >
                  {(row.markImageUrl?.trim() || "/default-rigger-mark.png") ? (
                    <span className="relative flex size-10 shrink-0 overflow-hidden rounded-full bg-muted">
                      <img
                        src={row.markImageUrl?.trim() || "/default-rigger-mark.png"}
                        alt=""
                        className="size-full object-cover"
                      />
                    </span>
                  ) : row.iconUrl?.trim() ? (
                    <Avatar className="size-10 shrink-0" size="lg">
                      <AvatarImage src={row.iconUrl} alt="" />
                      <AvatarFallback className="text-xs font-medium">
                        {row.nickname?.trim().slice(0, 1)?.toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <span
                      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground"
                      aria-hidden
                    >
                      {row.nickname?.trim().slice(0, 1)?.toUpperCase() ?? "?"}
                    </span>
                  )}
                </Link>
              </td>
              <td className="py-3 pr-4 font-medium">
                <Link
                  href={`/rigger/${encodeURIComponent(row.id)}`}
                  className="font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
                >
                  {row.nickname}
                </Link>
              </td>
              <td className="py-3 pr-4">
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700">
                  <span className="relative inline-flex h-1.5 w-1.5 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-600 opacity-60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue-600" />
                  </span>
                  {hasMounted ? formatRelativeTime(row.createdAt) : formatTime(row.createdAt)}
                </span>
              </td>
              <td className="py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    disabled={pendingId === row.id}
                    onClick={() => handleApprove(row.id)}
                  >
                    {pendingId === row.id ? "처리 중..." : "승인"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pendingRejectId === row.id}
                    onClick={() => openReject(row)}
                  >
                    {pendingRejectId === row.id ? "처리 중..." : "반려"}
                  </Button>
                </div>
              </td>
            </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 구분선 */}
      <hr className="border-t" />

      {/* 리거 재 승인 요청 */}
      <div>
        <h2 className="mb-3 text-sm font-semibold">리거 재 승인 요청</h2>
        {reRequestedItems.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            재 승인 요청한 리거가 없습니다.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="w-14 pb-2 pr-3 text-center font-medium" scope="col">
                    <span className="sr-only">회원마크</span>
                    <UserCircle className="inline-block size-5 text-muted-foreground" aria-hidden />
                  </th>
                  <th className="pb-2 pr-4 font-medium">닉네임</th>
                  <th className="pb-2 pr-4 font-medium">재요청일</th>
                  <th className="pb-2 font-medium">승인 / 반려</th>
                </tr>
              </thead>
              <tbody>
                {reRequestedItems.map((row) => (
                  <tr key={row.id} className="border-b">
                    <td className="py-3 pr-3 align-middle">
                      <Link
                        href={`/rigger/${encodeURIComponent(row.id)}`}
                        className="inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full"
                        aria-label={`${row.nickname} 회원 상세 보기`}
                      >
                        {(row.markImageUrl?.trim() || "/default-rigger-mark.png") ? (
                          <span className="relative flex size-10 shrink-0 overflow-hidden rounded-full bg-muted">
                            <img
                              src={row.markImageUrl?.trim() || "/default-rigger-mark.png"}
                              alt=""
                              className="size-full object-cover"
                            />
                          </span>
                        ) : row.iconUrl?.trim() ? (
                          <Avatar className="size-10 shrink-0" size="lg">
                            <AvatarImage src={row.iconUrl} alt="" />
                            <AvatarFallback className="text-xs font-medium">
                              {row.nickname?.trim().slice(0, 1)?.toUpperCase() ?? "?"}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <span
                            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground"
                            aria-hidden
                          >
                            {row.nickname?.trim().slice(0, 1)?.toUpperCase() ?? "?"}
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 font-medium">
                      <Link
                        href={`/rigger/${encodeURIComponent(row.id)}`}
                        className="font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
                      >
                        {row.nickname}
                      </Link>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700">
                        <span className="relative inline-flex h-1.5 w-1.5 shrink-0">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-600 opacity-60" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue-600" />
                        </span>
                        {hasMounted
                          ? formatRelativeTime(row.reRequestedAt)
                          : formatTime(row.reRequestedAt)}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          disabled={pendingId === row.id}
                          onClick={() => handleApprove(row.id)}
                        >
                          {pendingId === row.id ? "처리 중..." : "승인"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pendingRejectId === row.id}
                          onClick={() => openReject(row)}
                        >
                          {pendingRejectId === row.id ? "처리 중..." : "반려"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 구분선 */}
      <hr className="border-t" />

      {/* 반려한 목록 */}
      <div>
        <h2 className="mb-3 text-sm font-semibold">반려한 목록</h2>
        {rejectedItems.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            반려한 리거가 없습니다.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="w-14 pb-2 pr-3 text-center font-medium" scope="col">
                    <span className="sr-only">회원마크</span>
                    <UserCircle className="inline-block size-5 text-muted-foreground" aria-hidden />
                  </th>
                  <th className="pb-2 pr-4 font-medium">닉네임</th>
                  <th className="pb-2 pr-4 font-medium">요청일</th>
                  <th className="pb-2 pr-4 font-medium">반려일</th>
                  <th className="pb-2 font-medium">메시지</th>
                </tr>
              </thead>
              <tbody>
                {rejectedItems.map((row) => (
                  <tr key={row.id} className="border-b">
                    <td className="py-3 pr-3 align-middle">
                      <Link
                        href={`/rigger/${encodeURIComponent(row.id)}`}
                        className="inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full"
                        aria-label={`${row.nickname} 회원 상세 보기`}
                      >
                        {(row.markImageUrl?.trim() || "/default-rigger-mark.png") ? (
                          <span className="relative flex size-10 shrink-0 overflow-hidden rounded-full bg-muted">
                            <img
                              src={row.markImageUrl?.trim() || "/default-rigger-mark.png"}
                              alt=""
                              className="size-full object-cover"
                            />
                          </span>
                        ) : row.iconUrl?.trim() ? (
                          <Avatar className="size-10 shrink-0" size="lg">
                            <AvatarImage src={row.iconUrl} alt="" />
                            <AvatarFallback className="text-xs font-medium">
                              {row.nickname?.trim().slice(0, 1)?.toUpperCase() ?? "?"}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <span
                            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground"
                            aria-hidden
                          >
                            {row.nickname?.trim().slice(0, 1)?.toUpperCase() ?? "?"}
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 font-medium">
                      <Link
                        href={`/rigger/${encodeURIComponent(row.id)}`}
                        className="font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
                      >
                        {row.nickname}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {hasMounted ? formatRelativeTime(row.createdAt) : formatTime(row.createdAt)}
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {formatTime(row.updatedAt)}
                    </td>
                    <td className="py-3">
                      {row.rejectionNote?.trim() ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs"
                          onClick={() => setViewMessageModal(row)}
                        >
                          보기
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 보낸 쪽지 확인 모달 (읽기 전용) */}
      <Dialog
        open={!!viewMessageModal}
        onOpenChange={(open) => !open && setViewMessageModal(null)}
      >
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>보낸 쪽지</DialogTitle>
            <DialogDescription>
              반려 시 해당 리거에게 보낸 쪽지 내용입니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {viewMessageModal?.rejectionNote?.trim() ? (() => {
              const raw = viewMessageModal.rejectionNote.trim();
              const firstNewline = raw.indexOf("\n\n");
              const title = firstNewline === -1 ? "" : raw.slice(0, firstNewline).trim();
              const content = firstNewline === -1 ? raw : raw.slice(firstNewline + 2).trim();
              return (
                <>
                  {title ? (
                    <div className="grid gap-1.5">
                      <span className="text-xs font-semibold text-muted-foreground">제목</span>
                      <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                        {title}
                      </p>
                    </div>
                  ) : null}
                  <div className="grid gap-1.5">
                    <span className="text-xs font-semibold text-muted-foreground">내용</span>
                    <pre className="max-h-48 overflow-y-auto rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap font-sans">
                      {content || "—"}
                    </pre>
                  </div>
                </>
              );
            })() : (
              <p className="text-sm text-muted-foreground">저장된 내용이 없습니다.</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setViewMessageModal(null)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 반려 모달: 쪽지 제목 + 내용 */}
      <Dialog
        open={!!rejectModal}
        onOpenChange={(open) => !open && closeRejectModal()}
      >
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>반려 및 쪽지 보내기</DialogTitle>
            <DialogDescription>
              리거 승인을 반려하고, 반려 사유를 쪽지로 전달합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="reject-title">쪽지 제목 (선택)</Label>
              <Input
                id="reject-title"
                placeholder="예: 리거 승인 반려"
                value={rejectTitle}
                onChange={(e) => setRejectTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reject-content">쪽지 내용 *</Label>
              <Textarea
                id="reject-content"
                placeholder="반려 사유를 입력해 주세요."
                value={rejectContent}
                onChange={(e) => setRejectContent(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={closeRejectModal}>
              취소
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void submitReject()}
              disabled={!!pendingRejectId || !rejectContent.trim()}
            >
              {pendingRejectId ? "처리 중…" : "반려하고 쪽지 보내기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
