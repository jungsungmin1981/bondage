import Link from "next/link";
import { Fragment } from "react";
import { auth } from "@workspace/auth";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getRiggerPhotoPosts } from "@workspace/db";
import { Button } from "@workspace/ui/components/button";
import {
  applyCurrentUserToRigger,
  getRiggerById,
  getRiggerIdForUserId,
  TIER_LABELS,
} from "@/lib/rigger-sample";
import { RiggerTierCard } from "@/components/rigger-tier-card";

export default async function RiggerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) redirect("/login");

  const { id } = await params;
  const riggerRaw = getRiggerById(id);
  if (!riggerRaw) notFound();
  const rigger = applyCurrentUserToRigger(
    riggerRaw,
    session.user.id,
    session.user,
  );

  const tierLabel = TIER_LABELS[rigger.tier];
  const isOwnProfile = getRiggerIdForUserId(session.user.id) === rigger.id;
  const posts = await getRiggerPhotoPosts(id);
  const RECENT_POSTS = 6;
  const recentPosts = posts.slice(0, RECENT_POSTS);

  const pair = (label: string, value: string | null | undefined) => ({ label, value: value?.trim() ? value : "-" });
  const row1 = [pair("닉네임", rigger.name), pair("등급", tierLabel)];
  const row2 = [pair("성별", rigger.gender), pair("구분", rigger.division)];
  const row3 = [pair("버니구인", rigger.bunnyRecruit), pair("본러팅", rigger.bondageRating)];
  const styleValue = rigger.style?.trim() ? rigger.style : "-";
  const BIO_MAX_LENGTH = 300;
  const rawBio = rigger.bio?.trim() ? rigger.bio : "-";
  const bioValue =
    rawBio.length > BIO_MAX_LENGTH ? `${rawBio.slice(0, BIO_MAX_LENGTH)}…` : rawBio;

  return (
    <div className="min-h-[calc(100svh-3.5rem)] p-4 sm:p-6">
      <Link
        href="/rigger"
        className="mb-6 inline-block text-sm text-muted-foreground underline-offset-2 hover:underline"
      >
        ← 리거 목록
      </Link>

      <div
        className={`mx-auto grid max-w-4xl gap-6 sm:grid-cols-[minmax(0,280px)_1fr] lg:gap-10 ${isOwnProfile ? "sm:grid-rows-[auto_auto] sm:gap-x-6 lg:gap-x-10" : ""}`}
      >
        {/* 좌측: 등급 카드 (본인일 때는 카드+사진등록 버튼을 한 컨테이너로, 간격 최소) */}
        {isOwnProfile ? (
          <div className="flex flex-col gap-1 sm:col-start-1 sm:row-span-2 sm:row-start-1 sm:justify-end">
            <div className="w-full max-w-[280px]">
              <RiggerTierCard rigger={rigger} />
            </div>
            <Button asChild className="w-full max-w-[280px] sm:w-full" size="sm">
              <Link href={`/rigger/${encodeURIComponent(rigger.id)}/photos`}>
                사진 등록
              </Link>
            </Button>
          </div>
        ) : (
          <div className="flex justify-center sm:col-start-1 sm:row-start-1 sm:justify-start">
            <div className="w-full max-w-[280px]">
              <RiggerTierCard rigger={rigger} />
            </div>
          </div>
        )}

        {/* 우측: 회원 상세정보 - 항상 등급 카드 옆(같은 행) */}
        <div
          className={`min-w-0 rounded-xl border bg-card shadow-sm sm:col-start-2 sm:row-start-1 ${isOwnProfile ? "sm:row-span-2" : ""} ${!isOwnProfile ? "sm:relative sm:min-h-0" : ""}`}
        >
          <div className={`p-6 ${!isOwnProfile ? "sm:absolute sm:inset-0 sm:overflow-y-auto sm:rounded-xl" : ""}`}>
          <dl className="grid grid-cols-[5rem_1fr_5rem_1fr] gap-x-3 gap-y-1.5 items-baseline">
            {[row1, row2, row3].map((pairs, rowIndex) => (
              <Fragment key={rowIndex}>
                {pairs.map(({ label, value }) => (
                  <Fragment key={label}>
                    <dt className="shrink-0 text-sm font-medium text-muted-foreground">
                      {label}
                    </dt>
                    <dd className="min-w-0 text-lg font-medium">
                      {value}
                    </dd>
                  </Fragment>
                ))}
              </Fragment>
            ))}
            <dt className="shrink-0 text-sm font-medium text-muted-foreground">스타일</dt>
            <dd className="min-w-0 text-lg font-medium col-span-3">{styleValue}</dd>
          </dl>
          <dl className="mt-4 border-t pt-4 grid grid-cols-[5rem_1fr] gap-x-3 gap-y-1.5 items-baseline">
            <dt className="shrink-0 text-sm font-medium text-muted-foreground">자기소개</dt>
            <dd className="min-w-0 flex items-center gap-2 flex-wrap">
              {!isOwnProfile && (
                <Button asChild size="sm" className="shrink-0">
                  <Link href={`/messages/new?to=${encodeURIComponent(rigger.id)}`}>
                    쪽지 보내기
                  </Link>
                </Button>
              )}
              {isOwnProfile && (
                <Button asChild size="sm" className="shrink-0">
                  <Link href={`/rigger/${encodeURIComponent(rigger.id)}/edit`}>
                    정보수정
                  </Link>
                </Button>
              )}
            </dd>
            <dd className="col-start-2 min-w-0">
              <p className="min-w-0 max-w-full overflow-hidden text-lg font-medium whitespace-pre-wrap break-words">
                {bioValue}
              </p>
            </dd>
          </dl>
          </div>
        </div>
      </div>

      {/* 하단: 사진 섹션 (트위터 스타일) */}
      <div className="mx-auto mt-8 max-w-4xl">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">사진</h2>
          {posts.length > 0 && (
            <Button asChild variant="ghost" size="sm" className="shrink-0 text-xs">
              <Link href={`/rigger/${encodeURIComponent(rigger.id)}/photos`}>
                사진 더보기
              </Link>
            </Button>
          )}
        </div>
        {recentPosts.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">등록된 사진이 없습니다.</p>
        ) : (
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            {recentPosts.map((post) => (
              <li key={post.postId}>
                <Link
                  href={`/rigger/${encodeURIComponent(rigger.id)}/photos`}
                  className="block overflow-hidden rounded-2xl border border-border bg-card p-2 shadow-sm transition hover:shadow-md"
                >
                  <p className="text-[10px] text-muted-foreground">
                    {post.createdAt
                      ? new Date(post.createdAt).toLocaleString("ko-KR", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : ""}
                  </p>
                  <div
                    className={`mt-2 grid max-h-40 gap-0.5 overflow-hidden rounded-xl bg-muted sm:max-h-44 ${post.photos.length === 1 ? "grid-cols-1" : post.photos.length === 2 ? "grid-cols-2" : post.photos.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}
                  >
                    {post.photos.map((photo) => (
                      <div key={photo.id} className="relative aspect-square overflow-hidden bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.imagePath}
                          alt={post.caption ?? "등록된 사진"}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-foreground">
                    {post.caption?.trim() || "제목 없음"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
