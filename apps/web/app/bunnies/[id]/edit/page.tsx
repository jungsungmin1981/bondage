import Link from "next/link";
import { auth } from "@workspace/auth";
import { getBunnyProfileById } from "@workspace/db";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { BunnyCard } from "@/components/bunny-card";
import { BunnyProfileInline } from "../bunny-profile-inline";

export default async function BunnyEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) redirect("/login");

  const { id } = await params;
  const profile = await getBunnyProfileById(id);
  if (!profile) notFound();

  const isOwner = profile.userId === session.user.id;
  if (!isOwner && !isAdmin(session)) {
    redirect(`/bunnies/${id}`);
  }

  const name = (
    profile.nickname?.trim() ||
    profile.userName?.trim() ||
    "버니"
  ).slice(0, 50);
  const statusLabel =
    profile.status === "approved" ? "-" : "승인 대기중";

  return (
    <div className="flex min-h-0 flex-1 flex-col p-4 sm:h-[calc(100dvh-4rem)] sm:overflow-hidden sm:p-6">
      <Link
        href={`/bunnies/${id}`}
        className="mb-6 shrink-0 text-sm text-muted-foreground underline-offset-2 hover:underline"
      >
        ← 프로필로 돌아가기
      </Link>

      {/* 프로필 편집(리거)과 동일: 카드·폼 상단 맞춤, 오른쪽만 스크롤 → 카드 고정 */}
      <div className="mx-auto grid min-h-0 w-full max-w-4xl flex-1 gap-6 sm:grid-cols-[minmax(0,280px)_1fr] sm:grid-rows-[1fr] sm:items-start sm:gap-x-6 lg:gap-x-10">
        <div className="flex w-full max-w-[280px] flex-col gap-1 sm:col-start-1 sm:row-start-1 sm:justify-start">
          <div className="w-full">
            <BunnyCard cardImageUrl={profile.cardImageUrl} />
          </div>
        </div>
        <div className="min-h-0 min-w-0 overflow-y-auto rounded-xl border bg-card shadow-sm sm:col-start-2 sm:row-start-1">
          <div className="p-6">
            <h1 className="mb-4 text-xl font-semibold">
              {isAdmin(session) && !isOwner ? "프로필 수정 (관리자)" : "프로필 수정"}
            </h1>
            <BunnyProfileInline
              profileId={profile.id}
              statusLabel={statusLabel}
              name={name}
              gender={profile.gender}
              division={profile.division}
              activityRegion={profile.activityRegion}
              bio={profile.bio}
              defaultEditing={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
