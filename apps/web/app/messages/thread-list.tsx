"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";

type Thread = {
  threadId: string;
  otherNickname: string | null;
  otherIconUrl: string | null;
  lastMessageBody: string | null;
  lastMessageAt: Date | null;
  unreadCount: number;
  lastMessageFromMe: boolean;
  otherMemberType: string | null;
  otherMarkImageUrl: string | null;
};

export function ThreadList({ threads }: { threads: Thread[] }) {
  const pathname = usePathname();
  const activeId =
    pathname.startsWith("/messages/") ? pathname.split("/")[2] ?? null : null;

  return (
    <div className="p-3">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-base font-semibold">채팅</h1>
      </div>
      <div className="mb-3">
        <div className="rounded-full border bg-background px-3 py-2 text-sm text-muted-foreground">
          검색 (추후)
        </div>
      </div>
      <div className="mb-3 flex gap-2">
        <button className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
          전체
        </button>
        <button className="rounded-full px-3 py-1 text-xs font-semibold text-muted-foreground">
          요청
        </button>
      </div>
      <ul className="space-y-1">
        {threads.map((t) => {
          const isActive = activeId && decodeURIComponent(activeId) === t.threadId;
          return (
            <li key={t.threadId}>
              <Link
                href={`/messages/${encodeURIComponent(t.threadId)}`}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-muted/60",
                  isActive && "bg-muted",
                )}
              >
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
                  {t.otherMarkImageUrl ? (
                    // 마크 이미지가 있으면 원형 전체를 마크로 사용
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.otherMarkImageUrl}
                      alt="리거 마크"
                      className="h-full w-full object-cover"
                    />
                  ) : t.otherIconUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.otherIconUrl}
                      alt={t.otherNickname ?? "상대"}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">
                      {t.otherNickname ?? "상대"}
                      {t.otherMemberType && (
                        <span className="ml-1 align-middle rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          {t.otherMemberType === "rigger" ? "리거" : "버니"}
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-2">
                      {t.unreadCount > 0 && (
                        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[11px] font-semibold leading-5 text-white">
                          {t.unreadCount}
                        </span>
                      )}
                      <span className="text-[11px] text-muted-foreground">
                        {t.lastMessageAt
                          ? new Date(t.lastMessageAt).toLocaleDateString("ko-KR")
                          : ""}
                      </span>
                    </div>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {t.lastMessageBody ?? ""}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
        {threads.length === 0 && (
          <li className="py-10 text-center text-sm text-muted-foreground">
            대화가 없습니다.
          </li>
        )}
      </ul>
    </div>
  );
}

