import { headers } from "next/headers";
import { auth } from "@workspace/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getDirectMessageByIdAndToUserWithSender,
  markDirectMessageAsRead,
} from "@workspace/db";
import { getDirectMessageSourceLabel } from "@/lib/direct-message-source-labels";

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(d);
}

/** 계정 사용 제한 쪽지 본문에서 "정지 기간: ..." 추출 */
function getSuspensionPeriodFromBody(body: string): string | null {
  const match = body.match(/정지\s*기간:\s*(.+)/);
  return match ? match[1].trim() || null : null;
}

export default async function NoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const { id } = await params;
  const messageId = decodeURIComponent(id);
  const message = await getDirectMessageByIdAndToUserWithSender(
    messageId,
    session.user.id,
  );
  if (!message) redirect("/notes");

  if (!message.readAt) {
    await markDirectMessageAsRead(messageId, session.user.id);
  }

  const sourceLabel = getDirectMessageSourceLabel(message.source);
  const suspensionPeriod =
    message.source === "suspension_notice"
      ? getSuspensionPeriodFromBody(message.body)
      : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <Link
        href="/notes"
        className="text-sm text-muted-foreground underline hover:text-foreground"
      >
        ← 수신함으로
      </Link>
      <article className="mt-4 rounded-lg border bg-card p-4 sm:p-6">
        <header className="border-b pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={
                sourceLabel === "리거 승인 반려" ||
                sourceLabel === "게시물 승인 거절"
                  ? "inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950/60 dark:text-red-300"
                  : sourceLabel === "클래스 도전 반려"
                    ? "inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                    : sourceLabel === "계정 사용 제한"
                      ? "inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      : "text-xs font-medium text-muted-foreground"
              }
            >
              {sourceLabel}
            </p>
            {suspensionPeriod && (
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-200">
                정지 기간: {suspensionPeriod}
              </span>
            )}
          </div>
          {message.title?.trim() && (
            <h2 className="text-sm font-semibold text-foreground">
              {message.title.trim()}
            </h2>
          )}
          <p className="text-xs font-medium text-muted-foreground">
            관리자
          </p>
          <time
            className="text-xs text-muted-foreground"
            dateTime={message.createdAt.toISOString()}
            suppressHydrationWarning
          >
            {formatDate(message.createdAt)}
          </time>
        </header>
        <div className="mt-4 whitespace-pre-wrap break-words text-sm text-foreground">
          {message.body}
        </div>
        {message.imageUrls && message.imageUrls.length > 0 && (
          <div className="mt-4 border-t pt-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              참고 이미지
            </p>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {message.imageUrls.map((url, i) => (
                <li key={i} className="relative aspect-square overflow-hidden rounded-lg border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
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
      </article>
    </div>
  );
}
