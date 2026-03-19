import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@workspace/auth";
import { headers } from "next/headers";
import { getClassRequestById, getMemberProfileByUserId } from "@workspace/db";
import { isPrimaryAdmin } from "@/lib/admin";
import { ClassRequestDetailActions } from "./class-request-detail-actions";

const LEVEL_LABELS: Record<string, string> = {
  beginner: "초급",
  intermediate: "중급",
  advanced: "고급",
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: "검토 대기", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  reviewing: { label: "검토 중", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  done: { label: "반영 완료", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  rejected: { label: "반영 안 됨", className: "bg-muted text-muted-foreground" },
};

function formatDateTime(d: Date | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ClassRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  const request = await getClassRequestById(id);
  if (!request) notFound();

  const isOwner = !!session && request.userId === session.user.id;
  const isAdminUser = !!session && (
    isPrimaryAdmin(session) ||
    ((await getMemberProfileByUserId(session.user.id))?.memberType === "operator" &&
      (await getMemberProfileByUserId(session.user.id))?.status === "approved")
  );

  const statusInfo = STATUS_LABELS[request.status] ?? STATUS_LABELS.pending;

  return (
    <div className="mx-auto min-h-[calc(100svh-3.5rem)] w-full max-w-2xl p-4 sm:p-6">
      <Link
        href="/board/suggestion?tab=class-request"
        className="mb-4 inline-block min-h-[44px] text-sm text-muted-foreground underline-offset-2 hover:underline"
      >
        ← 클래스 요청 목록
      </Link>

      <article className="rounded-xl border border-border bg-card">
        <header className="border-b border-border px-4 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${statusInfo.className}`}>
              {statusInfo.label}
            </span>
            {request.level && (
              <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {LEVEL_LABELS[request.level] ?? request.level}
              </span>
            )}
          </div>
          <h1 className="mt-2 text-lg font-semibold leading-snug text-foreground">
            {request.title}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {request.authorNickname} · {formatDateTime(request.createdAt)}
          </p>
        </header>

        <div className="px-4 py-5">
          {Array.isArray(request.imageUrls) && (request.imageUrls as string[]).length > 0 && (
            <div className="mb-4 flex flex-col gap-3">
              {(request.imageUrls as string[]).map((url, i) => (
                <div key={i} className="overflow-hidden rounded-lg border border-border">
                  <img
                    src={url}
                    alt={`참고 이미지 ${i + 1}`}
                    className="max-h-[50vh] w-full object-contain bg-muted/20"
                  />
                </div>
              ))}
            </div>
          )}
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
            {request.description}
          </p>

          {(request.ropeThicknessMm || request.ropeLengthM || request.quantity) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {request.ropeThicknessMm && (
                <span className="rounded-md border border-border px-3 py-1 text-sm text-muted-foreground">
                  두께 {request.ropeThicknessMm}mm
                </span>
              )}
              {request.ropeLengthM && (
                <span className="rounded-md border border-border px-3 py-1 text-sm text-muted-foreground">
                  길이 {request.ropeLengthM}m
                </span>
              )}
              {request.quantity && (
                <span className="rounded-md border border-border px-3 py-1 text-sm text-muted-foreground">
                  {request.quantity}개
                </span>
              )}
            </div>
          )}

          {request.adminNote && (
            <div className="mt-4 rounded-lg bg-muted/50 px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">관리자 메모</p>
              <p className="text-sm text-foreground">{request.adminNote}</p>
            </div>
          )}
        </div>
      </article>

      <ClassRequestDetailActions
        requestId={id}
        isOwner={isOwner}
        isAdmin={isAdminUser}
        currentStatus={request.status}
        currentAdminNote={request.adminNote ?? ""}
      />
    </div>
  );
}
