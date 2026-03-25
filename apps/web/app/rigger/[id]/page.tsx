import Link from "next/link";
import { Fragment } from "react";
import { auth } from "@workspace/auth";
import {
  getActiveSuspensionForUser,
  getApprovedClassChallengeCountsByUserId,
  getPublicClassPostCountsByLevel,
  getRiggerProfileById,
  getUserCreatedAt,
} from "@workspace/db";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import { Mail } from "lucide-react";
import { applyCurrentUserToRigger, TIER_LABELS } from "@/lib/rigger-sample";
import { mapRiggerProfileToRigger } from "@/lib/rigger-from-db";
import { INITIAL_SIZE } from "@/lib/rigger-posts-constants";
import { fetchRiggerPostsSlice } from "@/lib/rigger-posts-slice";
import { RiggerTierCard } from "@/components/rigger-tier-card";
import { OwnProfileTierColumn } from "./own-profile-tier-column";
import { isAdmin } from "@/lib/admin";
import { getInviteKeyMinAgeHours } from "@/lib/invite-key-config";
import { RiggerPostsFeed } from "./rigger-posts-feed";
import { BioPreview } from "./bio-preview";
import { ClassSummaryBadges } from "./class-summary-badges";
import { RiggerDetailFormCard } from "./rigger-detail-form-card";

export default async function RiggerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ postId?: string }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) redirect("/login");

  const { id } = await params;
  const { postId: openPostId } = await searchParams;
  const dbProfile = await getRiggerProfileById(id);
  if (!dbProfile) notFound();

  const riggerRaw = mapRiggerProfileToRigger(dbProfile);
  // DB에서 markImageUrl, profileVisibility 등이 이미 포함되어 있으므로 별도 override 조회 불필요
  const rigger = applyCurrentUserToRigger(
    riggerRaw,
    session.user.id,
    session.user,
  );
  if (!rigger.userId) notFound();

  const PENDING_TIER_LABEL = "승인 대기중";
  const tierLabel =
    dbProfile.status === "approved"
      ? TIER_LABELS[rigger.tier]
      : PENDING_TIER_LABEL;
  const isOwnProfile =
    rigger.userId === session.user.id || isAdmin(session);
  const canSeePosts =
    isOwnProfile || (rigger.profileVisibility ?? "public") !== "private";

  // 병렬로 실행 가능한 쿼리들을 한 번에 처리
  const [classCounts, totalByLevel, suspension, createdAt, initialSlice] = await Promise.all([
    getApprovedClassChallengeCountsByUserId(rigger.userId),
    getPublicClassPostCountsByLevel(),
    rigger.userId ? getActiveSuspensionForUser(rigger.userId) : Promise.resolve(null),
    isOwnProfile ? getUserCreatedAt(session.user.id) : Promise.resolve(null),
    canSeePosts
      ? fetchRiggerPostsSlice(
          id,
          0,
          INITIAL_SIZE,
          session.user.id,
          isAdmin(session) ? { visibilityAsUserId: rigger.userId ?? undefined } : undefined,
        )
      : Promise.resolve(null),
  ]);

  const hasAnyPost = (initialSlice?.totalCount ?? 0) > 0;

  const isSuspended = !!suspension;
  const jailOverlayUrl = isSuspended ? "/jail-card.png" : undefined;
  const suspendedUntil =
    suspension != null
      ? suspension.suspendedUntil?.toISOString() ?? null
      : undefined;

  let canCreateInviteKey = false;
  let inviteKeyAllowedAt: string | null = null;
  if (isOwnProfile && !isSuspended) {
    const hours = getInviteKeyMinAgeHours();
    if (createdAt) {
      const allowedAt = new Date(
        createdAt.getTime() + hours * 60 * 60 * 1000,
      );
      inviteKeyAllowedAt = allowedAt.toISOString();
      canCreateInviteKey = new Date() >= allowedAt;
    } else {
      canCreateInviteKey = true;
    }
  }

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
  const row4 = [
    pair("활동지역", rigger.activityRegion),
    pair("스타일", rigger.style),
  ];
  const rawBio = rigger.bio?.trim() ? rigger.bio : "-";

  return (
    <div className="min-h-[calc(100svh-3.5rem)] p-4 sm:p-6">
      <Link
        href="/rigger"
        className="mb-6 inline-block text-sm text-muted-foreground underline-offset-2 hover:underline"
      >
        ← 리거 목록
      </Link>

      <div
        className={`mx-auto grid max-w-4xl gap-6 sm:grid-cols-[minmax(0,280px)_1fr] lg:gap-10 ${isOwnProfile ? "sm:gap-x-6 lg:gap-x-10" : ""}`}
      >
        {isOwnProfile ? (
          <OwnProfileTierColumn
            rigger={rigger}
            isSuspended={isSuspended}
            jailOverlayUrl={jailOverlayUrl}
            suspendedUntil={suspendedUntil}
          />
        ) : (
          <div className="flex justify-center sm:col-start-1 sm:row-start-1 sm:justify-start">
            <div className="w-full max-w-[280px]">
              <RiggerTierCard
                rigger={rigger}
                jailOverlayUrl={jailOverlayUrl}
                suspendedUntil={suspendedUntil}
              />
            </div>
          </div>
        )}

        {isOwnProfile ? (
          <RiggerDetailFormCard
            riggerId={rigger.id}
            tierLabel={tierLabel}
            approvalStatus={dbProfile.status as "pending" | "approved" | "rejected"}
            name={rigger.name}
            gender={rigger.gender}
            division={rigger.division}
            bunnyRecruit={rigger.bunnyRecruit}
            bondageRating={rigger.bondageRating}
            activityRegion={rigger.activityRegion}
            style={rigger.style}
            bio={rigger.bio}
            profileVisibility={rigger.profileVisibility ?? "public"}
            classCounts={classCounts}
            totalByLevel={totalByLevel}
            canCreateInviteKey={canCreateInviteKey}
            inviteKeyAllowedAt={inviteKeyAllowedAt}
            suspended={isSuspended}
          />
        ) : (
          <div
            className="min-w-0 sm:col-start-2 sm:row-start-1 min-h-0"
          >
            <div
              className="sm:h-full sm:min-h-0 sm:relative rounded-xl border bg-card shadow-sm"
            >
              <div
                className="p-6 sm:absolute sm:inset-0 sm:overflow-visible sm:rounded-xl"
              >
                <>
                <dl className="grid grid-cols-[auto_1fr] sm:grid-cols-[5rem_1fr_5rem_1fr] gap-x-3 gap-y-1.5 items-baseline">
                  {[row1, row2, row3, row4].map((pairs, rowIndex) => (
                    <Fragment key={rowIndex}>
                      {pairs.map(({ label, value }) => (
                        <Fragment key={label}>
                          <dt className="shrink-0 text-sm font-medium text-muted-foreground">
                            {label}
                          </dt>
                          <dd
                            className={
                              label === "활동지역"
                                ? "min-w-0 overflow-hidden text-base font-medium"
                                : label === "등급" && value === PENDING_TIER_LABEL
                                  ? "min-w-0 text-base font-medium text-blue-600"
                                  : "min-w-0 text-base font-medium"
                            }
                            title={
                              label === "활동지역" && value !== "-"
                                ? value
                                : undefined
                            }
                          >
                            {label === "활동지역" ? (
                              <span className="block truncate">{value}</span>
                            ) : (
                              value
                            )}
                          </dd>
                        </Fragment>
                      ))}
                    </Fragment>
                  ))}
                  <Fragment>
                    <dt className="shrink-0 text-sm font-medium text-muted-foreground">
                      클래스
                    </dt>
                    <dd className="col-span-3 min-w-0">
                      <ClassSummaryBadges
                        classCounts={classCounts}
                        totalByLevel={totalByLevel}
                      />
                    </dd>
                  </Fragment>
                </dl>
                <dl className="mt-4 grid grid-cols-[5rem_1fr] gap-x-3 gap-y-1.5 items-baseline border-t pt-4">
                  <dt className="shrink-0 text-sm font-medium text-muted-foreground">
                    자기소개
                  </dt>
                  <dd className="min-w-0 flex flex-wrap items-center gap-2">
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="shrink-0 rounded-lg border-border/70 bg-muted/30 shadow-sm shadow-black/5 hover:bg-muted/60"
                      aria-label="쪽지 보내기"
                    >
                      <Link
                        href={`/messages/new?to=${encodeURIComponent(rigger.id)}`}
                      >
                        <span className="inline-flex items-center gap-2">
                          <Mail className="size-5 text-foreground" strokeWidth={2} />
                          <span className="text-sm font-medium">쪽지 보내기</span>
                        </span>
                      </Link>
                    </Button>
                  </dd>
                  <dd className="col-start-2 min-w-0">
                    <BioPreview
                      fullText={
                        rawBio === "-"
                          ? "-"
                          : (rigger.bio?.trim() ?? "")
                      }
                    />
                  </dd>
                </dl>
              </>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mx-auto mt-8 max-w-4xl">
        <h2 className="text-sm font-medium text-muted-foreground">사진</h2>
        {!canSeePosts ? (
          <p className="mt-2 text-sm text-muted-foreground">
            비공개 프로필입니다.
          </p>
        ) : initialSlice && hasAnyPost ? (
          <RiggerPostsFeed
            riggerId={rigger.id}
            sessionUserId={session.user.id}
            initialPosts={initialSlice.posts}
            initialLikeByPostId={initialSlice.likeByPostId}
            initialCommentsByPhotoId={initialSlice.commentsByPhotoId}
            initialHasMore={initialSlice.hasMore}
            initialOpenPostId={openPostId ?? undefined}
            visibilityAsUserId={isAdmin(session) ? rigger.userId : undefined}
            canEditPostsAsRigger={isAdmin(session)}
          />
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            등록된 사진이 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}
