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
import { INITIAL_SIZE } from "@/lib/rigger-posts-constants";
import { fetchRiggerPostsSlice } from "@/lib/rigger-posts-slice";
import { RiggerTierCard } from "@/components/rigger-tier-card";
import { RiggerPostsFeed } from "./rigger-posts-feed";

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
  const hasAnyPost = posts.length > 0;
  const initialSlice = hasAnyPost
    ? await fetchRiggerPostsSlice(
        id,
        0,
        INITIAL_SIZE,
        session.user.id,
      )
    : null;

  const pair = (label: string, value: string | null | undefined) => ({
    label,
    value: value?.trim() ? value : "-",
  });
  const row1 = [pair("닉네임", rigger.name), pair("등급", tierLabel)];
  const row2 = [pair("성별", rigger.gender), pair("구분", rigger.division)];
  const row3 = [
    pair("버니구인", rigger.bunnyRecruit),
    pair("본러팅", rigger.bondageRating),
  ];
  const styleValue = rigger.style?.trim() ? rigger.style : "-";
  const BIO_MAX_LENGTH = 300;
  const rawBio = rigger.bio?.trim() ? rigger.bio : "-";
  const bioValue =
    rawBio.length > BIO_MAX_LENGTH
      ? `${rawBio.slice(0, BIO_MAX_LENGTH)}…`
      : rawBio;

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
        {isOwnProfile ? (
          <div className="flex flex-col gap-1 sm:col-start-1 sm:row-span-2 sm:row-start-1 sm:justify-end">
            <div className="w-full max-w-[280px]">
              <RiggerTierCard rigger={rigger} />
            </div>
            <Button
              asChild
              className="w-full max-w-[280px] sm:w-full"
              size="sm"
            >
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

        <div
          className={`min-w-0 rounded-xl border bg-card shadow-sm sm:col-start-2 sm:row-start-1 ${isOwnProfile ? "sm:row-span-2" : ""} ${!isOwnProfile ? "sm:relative sm:min-h-0" : ""}`}
        >
          <div
            className={`p-6 ${!isOwnProfile ? "sm:absolute sm:inset-0 sm:overflow-y-auto sm:rounded-xl" : ""}`}
          >
            <dl className="grid grid-cols-[5rem_1fr_5rem_1fr] gap-x-3 gap-y-1.5 items-baseline">
              {[row1, row2, row3].map((pairs, rowIndex) => (
                <Fragment key={rowIndex}>
                  {pairs.map(({ label, value }) => (
                    <Fragment key={label}>
                      <dt className="shrink-0 text-sm font-medium text-muted-foreground">
                        {label}
                      </dt>
                      <dd className="min-w-0 text-lg font-medium">{value}</dd>
                    </Fragment>
                  ))}
                </Fragment>
              ))}
              <dt className="shrink-0 text-sm font-medium text-muted-foreground">
                스타일
              </dt>
              <dd className="min-w-0 text-lg font-medium col-span-3">
                {styleValue}
              </dd>
            </dl>
            <dl className="mt-4 border-t pt-4 grid grid-cols-[5rem_1fr] gap-x-3 gap-y-1.5 items-baseline">
              <dt className="shrink-0 text-sm font-medium text-muted-foreground">
                자기소개
              </dt>
              <dd className="min-w-0 flex items-center gap-2 flex-wrap">
                {!isOwnProfile && (
                  <Button asChild size="sm" className="shrink-0">
                    <Link
                      href={`/messages/new?to=${encodeURIComponent(rigger.id)}`}
                    >
                      쪽지 보내기
                    </Link>
                  </Button>
                )}
                {isOwnProfile && (
                  <Button asChild size="sm" className="shrink-0">
                    <Link
                      href={`/rigger/${encodeURIComponent(rigger.id)}/edit`}
                    >
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

      <div className="mx-auto mt-8 max-w-4xl">
        <h2 className="text-sm font-medium text-muted-foreground">사진</h2>
        {!hasAnyPost || !initialSlice ? (
          <p className="mt-2 text-sm text-muted-foreground">
            등록된 사진이 없습니다.
          </p>
        ) : (
          <RiggerPostsFeed
            riggerId={rigger.id}
            sessionUserId={session.user.id}
            initialPosts={initialSlice.posts}
            initialLikeByPostId={initialSlice.likeByPostId}
            initialCommentsByPhotoId={initialSlice.commentsByPhotoId}
            initialHasMore={initialSlice.hasMore}
          />
        )}
      </div>
    </div>
  );
}
