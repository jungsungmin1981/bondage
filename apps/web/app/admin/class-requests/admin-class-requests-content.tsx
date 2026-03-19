"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
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
  listClassRequestsAction,
  updateClassRequestStatusAction,
  deleteClassRequestAction,
} from "@/app/board/class-request-actions";
import type { ClassRequestStatus, ClassRequestRow } from "@workspace/db";

const STATUS_OPTIONS: { value: ClassRequestStatus; label: string }[] = [
  { value: "pending", label: "검토 대기" },
  { value: "reviewing", label: "검토 중" },
  { value: "done", label: "반영 완료" },
  { value: "rejected", label: "반영 안 됨" },
];

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: "검토 대기", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  reviewing: { label: "검토 중", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  done: { label: "반영 완료", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  rejected: { label: "반영 안 됨", className: "bg-muted text-muted-foreground" },
};

const LEVEL_LABELS: Record<string, string> = {
  beginner: "초급",
  intermediate: "중급",
  advanced: "고급",
};

function formatDate(d: Date | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export function AdminClassRequestsContent() {
  const [requests, setRequests] = useState<ClassRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusMap, setStatusMap] = useState<Record<string, ClassRequestStatus>>({});
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function loadRequests() {
    setLoading(true);
    const data = await listClassRequestsAction({ limit: 100 });
    setRequests(data as ClassRequestRow[]);
    const sm: Record<string, ClassRequestStatus> = {};
    const nm: Record<string, string> = {};
    for (const r of data) {
      sm[r.id] = r.status as ClassRequestStatus;
      nm[r.id] = r.adminNote ?? "";
    }
    setStatusMap(sm);
    setNoteMap(nm);
    setLoading(false);
  }

  useEffect(() => {
    loadRequests().catch(() => setLoading(false));
  }, []);

  async function handleStatusSave(id: string) {
    setError(null);
    const result = await updateClassRequestStatusAction(id, statusMap[id]!, noteMap[id]);
    if (result?.ok === false) {
      setError(result.error ?? "오류가 발생했습니다.");
      return;
    }
    await loadRequests();
  }

  async function handleDelete(id: string) {
    if (!confirm("이 클래스 요청을 삭제하시겠습니까?")) return;
    startTransition(async () => {
      const result = await deleteClassRequestAction(id);
      if (result?.ok === false) {
        setError(result.error ?? "오류가 발생했습니다.");
        return;
      }
      await loadRequests();
    });
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">불러오는 중...</p>;
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card py-12 text-center text-sm text-muted-foreground">
        등록된 클래스 요청이 없습니다.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}
      {requests.map((req) => {
        const statusInfo = STATUS_LABELS[req.status] ?? STATUS_LABELS.pending;
        const isExpanded = expandedId === req.id;
        return (
          <div key={req.id} className="rounded-xl border border-border bg-card overflow-hidden">
            <button
              type="button"
              className="flex w-full items-start gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
              onClick={() => setExpandedId(isExpanded ? null : req.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${statusInfo.className}`}>
                    {statusInfo.label}
                  </span>
                  {req.level && (
                    <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {LEVEL_LABELS[req.level] ?? req.level}
                    </span>
                  )}
                </div>
                <p className="text-[15px] font-medium text-foreground line-clamp-1">{req.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {req.authorNickname} · {formatDate(req.createdAt)}
                </p>
              </div>
              <span className="mt-1 text-xs text-muted-foreground shrink-0">{isExpanded ? "▲" : "▼"}</span>
            </button>

            {isExpanded && (
              <div className="border-t border-border px-4 py-4 flex flex-col gap-4">
                {Array.isArray(req.imageUrls) && (req.imageUrls as string[]).length > 0 && (
                  <div className="flex flex-col gap-2">
                    {(req.imageUrls as string[]).map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt={`참고 이미지 ${i + 1}`}
                        className="max-h-48 w-full rounded-lg border border-border object-contain bg-muted/20"
                      />
                    ))}
                  </div>
                )}
                <p className="whitespace-pre-wrap text-sm text-foreground">{req.description}</p>
                {(req.ropeThicknessMm || req.ropeLengthM || req.quantity) && (
                  <div className="flex flex-wrap gap-2">
                    {req.ropeThicknessMm && (
                      <span className="rounded-md border border-border px-3 py-1 text-xs text-muted-foreground">두께 {req.ropeThicknessMm}mm</span>
                    )}
                    {req.ropeLengthM && (
                      <span className="rounded-md border border-border px-3 py-1 text-xs text-muted-foreground">길이 {req.ropeLengthM}m</span>
                    )}
                    {req.quantity && (
                      <span className="rounded-md border border-border px-3 py-1 text-xs text-muted-foreground">{req.quantity}개</span>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-2 border-t border-border pt-3">
                  <p className="text-sm font-medium text-foreground">상태 처리</p>
                  <Select
                    value={statusMap[req.id] ?? req.status}
                    onValueChange={(v) => setStatusMap((m) => ({ ...m, [req.id]: v as ClassRequestStatus }))}
                  >
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
                    value={noteMap[req.id] ?? ""}
                    onChange={(e) => setNoteMap((m) => ({ ...m, [req.id]: e.target.value }))}
                    placeholder="관리자 메모 (선택)"
                    rows={2}
                    maxLength={500}
                    className="resize-none"
                  />
                  <div className="flex gap-2">
                    <Button
                      className="min-h-[44px] flex-1"
                      onClick={() => handleStatusSave(req.id)}
                      disabled={isPending}
                    >
                      저장
                    </Button>
                    <Button
                      variant="outline"
                      className="min-h-[44px]"
                      asChild
                    >
                      <Link href={`/board/class-request/${encodeURIComponent(req.id)}`} target="_blank">
                        상세보기
                      </Link>
                    </Button>
                    <Button
                      variant="destructive"
                      className="min-h-[44px]"
                      onClick={() => handleDelete(req.id)}
                      disabled={isPending}
                    >
                      삭제
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
