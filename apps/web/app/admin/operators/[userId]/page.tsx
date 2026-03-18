import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@workspace/auth";
import { getOperatorUserById, getMemberProfileByUserId } from "@workspace/db";
import { isAdmin } from "@/lib/admin";
import { OperatorCardColumn } from "./operator-card-column";
import { OperatorInviteKeyButton } from "./operator-invite-key-button";

export default async function AdminOperatorDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const memberProfile = await getMemberProfileByUserId(session.user.id);
  const isApprovedOperator =
    memberProfile?.memberType === "operator" && memberProfile?.status === "approved";
  if (!isAdmin(session) && !isApprovedOperator) redirect("/");

  const { userId } = await params;
  const [op, profile] = await Promise.all([
    getOperatorUserById(userId),
    getMemberProfileByUserId(userId),
  ]);
  if (!op) notFound();

  /** 닉네임(member_profiles.nickname) 우선, 없으면 username·이메일 */
  const displayName =
    profile?.nickname?.trim() || op.username?.trim() || op.email || "—";
  const canEditCard = session.user.id === userId || isAdmin(session);
  const statusLabel =
    op.status === "approved" ? "승인" : op.status === "pending" ? "승인대기" : op.status ?? "-";

  const pair = (label: string, value: string | null | undefined) => ({
    label,
    value: value?.trim() ? value : "-",
  });
  const rows = [pair("닉네임", displayName), pair("상태", statusLabel)];

  return (
    <div className="min-h-[calc(100svh-3.5rem)] p-4 sm:p-6">
      <Link
        href="/admin/operators"
        className="mb-6 inline-block text-sm text-muted-foreground underline-offset-2 hover:underline"
      >
        ← 운영진 목록
      </Link>

      {/* 버니 상세와 동일: max-w-4xl, 280px 좌측 카드 + 이미지 수정, 우측 상세내용 (좌측 정렬) */}
      <div className="grid w-full max-w-4xl gap-6 sm:grid-cols-[minmax(0,280px)_1fr] lg:gap-10">
        {/* 좌측: 회원 카드 + 이미지 수정 (본인 또는 관리자만 버튼 노출) */}
        <OperatorCardColumn
          userId={userId}
          cardImageUrl={profile?.cardImageUrl ?? null}
          displayName={displayName}
          showPendingBadge={op.status !== "approved"}
          canEdit={canEditCard}
        />

        {/* 우측: 상세내용 */}
        <div className="min-w-0 rounded-xl border bg-card shadow-sm sm:col-start-2 sm:row-start-1 sm:relative sm:min-h-0">
          <div className="p-6 sm:absolute sm:inset-0 sm:overflow-y-auto sm:rounded-xl">
            <dl className="grid grid-cols-[5rem_1fr_5rem_1fr] gap-x-3 gap-y-1.5 items-baseline">
              {rows.map(({ label, value }) => (
                <span key={label} className="contents">
                  <dt className="shrink-0 text-sm font-medium text-muted-foreground">
                    {label}
                  </dt>
                  <dd
                    className="min-w-0 overflow-hidden text-base font-medium"
                    title={value !== "-" ? value : undefined}
                  >
                    <span className="block truncate">{value}</span>
                  </dd>
                </span>
              ))}
            </dl>
            <dl className="mt-4 grid grid-cols-[5rem_1fr] gap-x-3 gap-y-1.5 items-baseline border-t pt-4">
              <dt className="shrink-0 text-sm font-medium text-muted-foreground">
                인증키
              </dt>
              <dd className="min-w-0 flex flex-wrap items-center gap-2">
                {session.user.id === userId ? (
                  <OperatorInviteKeyButton />
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
