"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { approveBunnyPost, rejectBunnyPost } from "./actions";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { PostDetailApprovalDialog } from "./post-detail-approval-dialog";

export type BunnyApprovalItem = {
  approvalId: string;
  postId: string | null;
  createdAt: Date;
  updatedAt?: Date | null;
  imagePath: string | null;
  caption: string | null;
  riggerId: string | null;
  riggerNickname?: string | null;
  status?: "pending" | "approved" | "rejected";
};

function statusLabel(status: BunnyApprovalItem["status"]): string {
  if (status === "approved") return "승인 완료";
  if (status === "rejected") return "승인 거절";
  return "승인 요청";
}

function formatTime(d: Date): string {
  return new Date(d).toLocaleString("ko-KR");
}

function getTimes(item: BunnyApprovalItem): {
  requestTime: string;
  resultTime: string | null;
} {
  const requestTime = formatTime(item.createdAt);
  if (item.status === "approved" || item.status === "rejected") {
    const resultTime = item.updatedAt ? formatTime(item.updatedAt) : requestTime;
    return { requestTime, resultTime };
  }
  return { requestTime, resultTime: null };
}

export function BunnyApprovalsList({
  items,
}: {
  items: BunnyApprovalItem[];
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<BunnyApprovalItem | null>(
    null,
  );

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
      {items.map((item) => {
        const isProcessed = item.status === "approved" || item.status === "rejected";
        const { requestTime, resultTime } = getTimes(item);
        return (
          <li
            key={item.approvalId}
            className={cn(
              "flex flex-wrap items-center gap-4 rounded-lg border bg-card p-3 sm:flex-nowrap",
              isProcessed && "opacity-75 bg-muted/50 border-muted",
            )}
          >
            <button
              type="button"
              onClick={() => item.riggerId && item.postId && setSelectedItem(item)}
              className={cn(
                "relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                item.riggerId && item.postId ? "cursor-pointer" : "cursor-default",
              )}
              disabled={!item.riggerId || !item.postId}
              aria-label="게시물 상세 보기"
            >
              {item.imagePath ? (
                <img
                  src={item.imagePath}
                  alt={item.caption ?? "승인 요청 사진"}
                  className={cn("h-full w-full object-cover", isProcessed && "opacity-80")}
                />
              ) : (
                <img
                  src="/approve-request-icon.png"
                  alt="승인 요청"
                  className="h-8 w-8 opacity-70"
                />
              )}
            </button>
            <div className="min-w-0 flex-1">
              <p className="flex min-w-0 items-center gap-2 text-sm">
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-none",
                    item.status === "pending" &&
                      "relative border-blue-600/50 bg-blue-50/70 text-blue-700 ring-2 ring-blue-500/30",
                    item.status === "approved" &&
                      "border-green-600/30 bg-green-50/50 text-green-700",
                    item.status === "rejected" &&
                      "border-red-600/30 bg-red-50/50 text-red-700",
                  )}
                >
                  {item.status === "pending" && (
                    <span className="relative mr-1.5 inline-flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-600 opacity-50" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-600" />
                    </span>
                  )}
                  {statusLabel(item.status)}
                </span>
                <span className="shrink-0 text-muted-foreground/60">·</span>
                {item.riggerId ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-7 shrink-0 rounded-full px-2.5 py-0 text-xs font-semibold",
                      "border border-muted-foreground/40 bg-background/50 hover:bg-muted/40",
                      item.status === "pending" && "border-blue-600/30 bg-blue-50/40 hover:bg-blue-50/60",
                      item.status === "approved" && "border-green-600/30 bg-green-50/40 hover:bg-green-50/60",
                      item.status === "rejected" && "border-red-600/30 bg-red-50/40 hover:bg-red-50/60",
                    )}
                    asChild
                  >
                    <Link href={`/rigger/${encodeURIComponent(item.riggerId)}`}>
                      {item.riggerNickname?.trim() ?? "-"}
                    </Link>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-7 shrink-0 rounded-full px-2.5 py-0 text-xs font-semibold",
                      "border border-muted-foreground/40 bg-background/50",
                      item.status === "pending" && "border-blue-600/30 bg-blue-50/40",
                      item.status === "approved" && "border-green-600/30 bg-green-50/40",
                      item.status === "rejected" && "border-red-600/30 bg-red-50/40",
                    )}
                    disabled
                  >
                    {item.riggerNickname?.trim() ?? "-"}
                  </Button>
                )}
                <span className="shrink-0 text-muted-foreground/60">·</span>
                <span className="min-w-0 truncate font-semibold">
                  {item.caption?.trim() || "제목 없음"}
                </span>
              </p>
              {item.status === "pending" && (
                <p className="mt-1 text-xs text-muted-foreground">
                  승인 요청 : {requestTime}
                </p>
              )}
              {item.status === "approved" && (
                <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                  <p>승인 요청 : {requestTime}</p>
                  <p>승인 완료 : {resultTime}</p>
                </div>
              )}
              {item.status === "rejected" && (
                <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                  <p>승인 요청 : {requestTime}</p>
                  <p>승인 거절 : {resultTime}</p>
                </div>
              )}
            </div>
            {item.status === "pending" && (
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
            )}
          </li>
        );
      })}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <PostDetailApprovalDialog
        open={selectedItem !== null}
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onProcessed={() => {
          setSelectedItem(null);
          router.refresh();
        }}
      />
    </ul>
  );
}
