"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { UserCircle } from "lucide-react";
import { approveOperatorProfileAction } from "./actions";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import type { OperatorProfileRowForAdmin } from "@workspace/db";

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

export function OperatorApprovalsList({
  items,
}: {
  items: OperatorProfileRowForAdmin[];
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);

  function handleApprove(profileId: string) {
    setPendingId(profileId);
    approveOperatorProfileAction(profileId).then((result) => {
      setPendingId(null);
      if (result.ok) router.refresh();
      else if (!result.ok) alert(result.error);
    });
  }

  async function handleResetOtp(userId: string) {
    setResettingUserId(userId);
    try {
      const res = await fetch(`/api/admin/operators/${encodeURIComponent(userId)}/reset-otp`, {
        method: "POST",
      });
      if (res.ok) {
        router.refresh();
      } else {
        const j = await res.json().catch(() => ({}));
        alert(typeof j?.error === "string" ? j.error : "OTP 초기화에 실패했습니다.");
      }
    } finally {
      setResettingUserId(null);
    }
  }

  return (
    <div className="overflow-x-auto">
      {items.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">
          운영진이 없습니다.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th
                className="w-14 pb-2 pr-3 text-center font-medium"
                scope="col"
              >
                <span className="sr-only">아이콘</span>
                <UserCircle
                  className="inline-block size-5 text-muted-foreground"
                  aria-hidden
                />
              </th>
              <th className="pb-2 pr-4 font-medium">닉네임</th>
              <th className="pb-2 pr-4 font-medium">추천인 닉네임</th>
              <th className="pb-2 pr-4 font-medium">요청일</th>
              <th className="pb-2 pr-4 font-medium">승인</th>
              <th className="pb-2 font-medium">OTP 초기화</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id} className="border-b">
                <td className="py-3 pr-3 align-middle">
                  {row.iconUrl?.trim() ? (
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
                </td>
                <td className="py-3 pr-4 font-medium">{row.nickname}</td>
                <td className="py-3 pr-4 text-muted-foreground">
                  {row.referrerNickname ?? "관리자"}
                </td>
                <td className="py-3 pr-4">
                  {row.status === "pending" ? (
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 dark:text-blue-400">
                      <span className="relative inline-flex h-1.5 w-1.5 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-600 opacity-60" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue-600" />
                      </span>
                      {formatRelativeTime(row.createdAt)}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {formatRelativeTime(row.createdAt)}
                    </span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  {row.status === "pending" ? (
                    <Button
                      size="sm"
                      disabled={pendingId === row.id}
                      onClick={() => handleApprove(row.id)}
                    >
                      {pendingId === row.id ? "처리 중…" : "승인"}
                    </Button>
                  ) : (
                    <span className="text-xs font-medium text-muted-foreground">
                      승인됨
                    </span>
                  )}
                </td>
                <td className="py-3">
                  {row.status === "approved" && row.userId ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={resettingUserId === row.userId}
                      onClick={() => handleResetOtp(row.userId!)}
                    >
                      {resettingUserId === row.userId ? "처리 중…" : "OTP 초기화"}
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
