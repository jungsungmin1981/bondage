"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { approveBunnyPost, rejectBunnyPost } from "./actions";
import { Button } from "@workspace/ui/components/button";

export type BunnyApprovalItem = {
  approvalId: string;
  postId: string | null;
  createdAt: Date;
  imagePath: string | null;
  caption: string | null;
  riggerId: string | null;
};

export function BunnyApprovalsList({
  items,
}: {
  items: BunnyApprovalItem[];
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async (approvalId: string) => {
    setPendingId(approvalId);
    setError(null);
    const result = await approveBunnyPost(approvalId);
    setPendingId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  };

  const handleReject = async (approvalId: string) => {
    setPendingId(approvalId);
    setError(null);
    const result = await rejectBunnyPost(approvalId);
    setPendingId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  };

  return (
    <ul className="mt-6 space-y-3">
      {items.map((item) => (
        <li
          key={item.approvalId}
          className="flex flex-wrap items-center gap-4 rounded-lg border bg-card p-3 sm:flex-nowrap"
        >
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
            {item.imagePath ? (
              <img
                src={item.imagePath}
                alt={item.caption ?? "승인 요청 사진"}
                className="h-full w-full object-cover"
              />
            ) : (
              <img
                src="/approve-request-icon.png"
                alt="승인 요청"
                className="h-8 w-8 opacity-70"
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {item.caption ?? "제목 없음"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              승인 대기중 ·{" "}
              {new Date(item.createdAt).toLocaleString("ko-KR")}
            </p>
            {item.riggerId && (
              <a
                href={`/rigger/${item.riggerId}`}
                className="mt-1 inline-block text-xs text-primary underline"
              >
                리거 프로필 보기
              </a>
            )}
          </div>
          <div className="flex w-full shrink-0 gap-2 sm:w-auto">
            <Button
              size="sm"
              variant="default"
              disabled={pendingId !== null}
              onClick={() => handleApprove(item.approvalId)}
            >
              {pendingId === item.approvalId ? "처리 중…" : "승인"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pendingId !== null}
              onClick={() => handleReject(item.approvalId)}
            >
              거절
            </Button>
          </div>
        </li>
      ))}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </ul>
  );
}
