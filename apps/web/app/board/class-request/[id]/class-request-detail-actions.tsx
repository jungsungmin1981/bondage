"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import {
  deleteClassRequestAction,
  updateClassRequestStatusAction,
} from "@/app/board/class-request-actions";
import type { ClassRequestStatus } from "@workspace/db";

const STATUS_OPTIONS: { value: ClassRequestStatus; label: string }[] = [
  { value: "pending", label: "검토 대기" },
  { value: "reviewing", label: "검토 중" },
  { value: "done", label: "반영 완료" },
  { value: "rejected", label: "반영 안 됨" },
];

type Props = {
  requestId: string;
  isOwner: boolean;
  isAdmin: boolean;
  currentStatus: string;
  currentAdminNote: string;
};

export function ClassRequestDetailActions({
  requestId,
  isOwner,
  isAdmin,
  currentStatus,
  currentAdminNote,
}: Props) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [status, setStatus] = useState<ClassRequestStatus>(currentStatus as ClassRequestStatus);
  const [adminNote, setAdminNote] = useState(currentAdminNote);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleDelete() {
    startTransition(async () => {
      const result = await deleteClassRequestAction(requestId);
      if (result?.ok === false) {
        setError(result.error ?? "오류가 발생했습니다.");
        return;
      }
      router.push("/board/suggestion?tab=class-request");
    });
  }

  async function handleStatusUpdate() {
    setSaving(true);
    setError(null);
    const result = await updateClassRequestStatusAction(requestId, status, adminNote);
    setSaving(false);
    if (result?.ok === false) {
      setError(result.error ?? "오류가 발생했습니다.");
    }
  }

  if (!isOwner && !isAdmin) return null;

  return (
    <div className="mt-4 flex flex-col gap-4">
      {isAdmin && (
        <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
          <p className="text-sm font-medium text-foreground">관리자 처리</p>
          <div className="flex flex-col gap-2">
            <Select value={status} onValueChange={(v) => setStatus(v as ClassRequestStatus)}>
              <SelectTrigger className="min-h-[44px] w-full" suppressHydrationWarning>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="관리자 메모 (선택)"
              rows={3}
              maxLength={500}
              className="resize-none"
            />
            <Button
              className="min-h-[44px] w-full"
              onClick={handleStatusUpdate}
              disabled={saving}
            >
              {saving ? "저장 중..." : "상태 저장"}
            </Button>
          </div>
        </div>
      )}

      {(isOwner || isAdmin) && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="min-h-[44px]"
            onClick={() => router.push("/board/suggestion?tab=class-request")}
          >
            목록으로
          </Button>
          {(isOwner || isAdmin) && (
            <Button
              variant="destructive"
              className="min-h-[44px]"
              onClick={() => setDeleteOpen(true)}
            >
              삭제
            </Button>
          )}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>클래스 요청 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 클래스 요청을 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isPending}>
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
