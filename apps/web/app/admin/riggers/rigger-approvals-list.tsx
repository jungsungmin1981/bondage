"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserCircle } from "lucide-react";
import { approveRiggerProfileAction } from "./actions";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import type { PendingRiggerProfileRow } from "@workspace/db";

export type RiggerApprovalListItem = PendingRiggerProfileRow & {
  markImageUrl?: string | null;
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
}: {
  items: RiggerApprovalListItem[];
}) {
  const [hasMounted, setHasMounted] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => setHasMounted(true), []);

  function handleApprove(profileId: string) {
    setPendingId(profileId);
    approveRiggerProfileAction(profileId).then(() => {
      setPendingId(null);
      router.refresh();
    });
  }

  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="w-14 pb-2 pr-3 text-center font-medium" scope="col">
              <span className="sr-only">회원마크</span>
              <UserCircle className="inline-block size-5 text-muted-foreground" aria-hidden />
            </th>
            <th className="pb-2 pr-4 font-medium">닉네임</th>
            <th className="pb-2 pr-4 font-medium">요청일</th>
            <th className="pb-2 font-medium">승인</th>
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
                <Button
                  size="sm"
                  disabled={pendingId === row.id}
                  onClick={() => handleApprove(row.id)}
                >
                  {pendingId === row.id ? "처리 중..." : "승인"}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
