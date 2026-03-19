import Link from "next/link";
import { unstable_cache } from "next/cache";
import { getClassRequests, getClassRequestCount } from "@workspace/db";
import { ClassRequestListClient } from "./class-request-list-client";

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
  const t = new Date(d);
  const now = new Date();
  const diffMs = now.getTime() - t.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
    if (diffHours === 0) {
      const diffMins = Math.floor(diffMs / (60 * 1000));
      if (diffMins < 1) return "방금 전";
      return `${diffMins}분 전`;
    }
    return `${diffHours}시간 전`;
  }
  if (diffDays === 1) return "어제";
  if (diffDays < 7) return `${diffDays}일 전`;
  return t.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export async function ClassRequestListSection() {
  const [requests, total] = await Promise.all([
    unstable_cache(
      () => getClassRequests({ limit: 30 }),
      ["class-requests-list"],
      { revalidate: 30 },
    )(),
    unstable_cache(
      () => getClassRequestCount(),
      ["class-requests-count"],
      { revalidate: 30 },
    )(),
  ]);

  return (
    <div>
      {/* 서브탭 */}
      <div className="mb-4 flex gap-0 border-b border-border text-sm">
        <a
          href="/board/suggestion"
          className="min-h-[44px] flex-1 border-b-2 border-transparent px-3 py-2.5 text-center font-medium text-muted-foreground transition hover:border-muted-foreground/50 hover:text-foreground sm:flex-initial sm:px-4"
        >
          수정/기능 제안
        </a>
        <a
          href="/board/suggestion?tab=class-request"
          className="min-h-[44px] flex-1 border-b-2 border-primary px-3 py-2.5 text-center font-medium text-foreground transition sm:flex-initial sm:px-4"
        >
          클래스 요청
        </a>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{total}개의 요청</p>
        <ClassRequestListClient />
      </div>

      {requests.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-12 text-center text-sm text-muted-foreground">
          등록된 클래스 요청이 없습니다.
        </div>
      ) : (
        <ul className="flex flex-col gap-0 border-t border-border">
          {requests.map((req) => {
            const statusInfo = STATUS_LABELS[req.status] ?? { label: "검토 대기", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" };
            return (
              <li key={req.id} className="border-b border-border">
                <Link
                  href={`/board/class-request/${encodeURIComponent(req.id)}`}
                  className="flex min-h-[56px] flex-col justify-center gap-0.5 px-2 py-3 transition-colors hover:bg-muted/40 active:bg-muted/60"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${statusInfo.className}`}>
                      {statusInfo.label}
                    </span>
                    {req.level && (
                      <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {LEVEL_LABELS[req.level] ?? req.level}
                      </span>
                    )}
                    <span className="line-clamp-1 min-w-0 flex-1 text-[15px] font-medium text-foreground">
                      {req.title}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {req.authorNickname} · {formatDate(req.createdAt)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
