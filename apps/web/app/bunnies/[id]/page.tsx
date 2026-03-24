import Link from "next/link";
import { Fragment } from "react";
import { auth } from "@workspace/auth";
import {
  getActiveSuspensionForUser,
  getBunnyProfileById,
  getMemberProfileByUserId,
  getUserCreatedAt,
} from "@workspace/db";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import { BunnyCard } from "@/components/bunny-card";
import { isAdmin } from "@/lib/admin";
import { resolveBunnyCardUrl } from "@/lib/bunny-default-card-config";
import { getInviteKeyMinAgeHours } from "@/lib/invite-key-config";
import { BioPreview } from "@/app/rigger/[id]/bio-preview";
import { fetchBunnyPostsSlice, BUNNY_INITIAL_SIZE } from "@/lib/bunny-posts-slice";
import { BunnyProfileInline } from "./bunny-profile-inline";
import { OwnBunnyCardColumn } from "./own-bunny-card-column";
import { BunnyPostsFeed } from "./bunny-posts-feed";

export default async function BunnyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) redirect("/login");

  const { id } = await params;
  const [profile, viewerProfile] = await Promise.all([
    getBunnyProfileById(id),
    getMemberProfileByUserId(session.user.id),
  ]);
  if (!profile) notFound();
  const isViewerRigger = viewerProfile?.memberType === "rigger";

  const name = (
    profile.nickname?.trim() ||
    profile.userName?.trim() ||
    "버니"
  ).slice(0, 50);
  const isOwnProfile = profile.userId === session.user.id;
  const canEditAsAdmin = !isOwnProfile && isAdmin(session);

  const PENDING_TIER_LABEL = "승인 대기중";
  const statusLabel =
    profile.status === "approved" ? "-" : PENDING_TIER_LABEL;

  const pair = (label: string, value: string | null | undefined) => ({
    label,
    value: value?.trim() ? value : "-",
  });
  const row1 = [pair("닉네임", name), pair("상태", statusLabel)];
  const row2 = [
    pair("성별", profile.gender),
    pair("구분", "버니"),
  ];
  const row3 = [pair("활동지역", profile.activityRegion)];

  const rawBio = profile.bio?.trim() ? profile.bio : "-";
  const [photos, suspension] = await Promise.all([
    fetchBunnyPostsSlice(profile.id, 0, BUNNY_INITIAL_SIZE, session.user.id),
    profile.userId ? getActiveSuspensionForUser(profile.userId) : Promise.resolve(null),
  ]);
  const { posts: initialPosts, likeByPhotoId: initialLikeByPhotoId, hasMore: initialHasMore } = photos;
  const hasPhotos = initialPosts.length > 0;
  const isSuspended = !!suspension;
  const jailOverlay = isSuspended;
  const suspendedUntil =
    suspension != null
      ? suspension.suspendedUntil?.toISOString() ?? null
      : undefined;

  let canCreateInviteKey = false;
  let inviteKeyAllowedAt: string | null = null;
  if (isOwnProfile && !isSuspended) {
    const createdAt = await getUserCreatedAt(session.user.id);
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
  const showInviteKeyButton =
    isOwnProfile && profile.status === "approved" && !isSuspended;

  return (
    <div className="min-h-[calc(100svh-3.5rem)] p-4 sm:p-6">
      <Link
        href="/bunnies"
        className="mb-6 inline-block text-sm text-muted-foreground underline-offset-2 hover:underline"
      >
        ← 버니 목록
      </Link>

      <div
        className={`mx-auto grid max-w-4xl gap-6 sm:grid-cols-[minmax(0,280px)_1fr] lg:gap-10 ${isOwnProfile ? "sm:grid-rows-[auto_auto] sm:gap-x-6 lg:gap-x-10" : ""}`}
      >
        {isOwnProfile ? (
          <OwnBunnyCardColumn
            profileId={profile.id}
            cardImageUrl={resolveBunnyCardUrl(profile.cardImageUrl)}
            jailOverlay={jailOverlay}
            suspendedUntil={suspendedUntil}
          />
        ) : (
          <div className="flex justify-center sm:col-start-1 sm:row-start-1 sm:justify-start">
            <div className="w-full max-w-[280px]">
              <BunnyCard
                cardImageUrl={resolveBunnyCardUrl(profile.cardImageUrl)}
                jailOverlay={jailOverlay}
                suspendedUntil={suspendedUntil}
              />
            </div>
          </div>
        )}

        <div
          className={`min-w-0 rounded-xl border bg-card shadow-sm sm:col-start-2 sm:row-start-1 ${isOwnProfile ? "sm:row-span-2" : ""} ${!isOwnProfile ? "sm:relative sm:min-h-0" : ""}`}
        >
          <div
            className={`p-6 ${!isOwnProfile ? "sm:absolute sm:inset-0 sm:overflow-y-auto sm:rounded-xl" : ""}`}
          >
            {isOwnProfile ? (
              <BunnyProfileInline
                profileId={profile.id}
                statusLabel={statusLabel}
                name={name}
                gender={profile.gender}
                division={profile.division}
                activityRegion={profile.activityRegion}
                bio={profile.bio}
                canCreateInviteKey={canCreateInviteKey}
                inviteKeyAllowedAt={inviteKeyAllowedAt}
                showInviteKeyButton={showInviteKeyButton}
              />
            ) : (
              <>
                <dl className="grid grid-cols-[5rem_1fr_5rem_1fr] gap-x-3 gap-y-1.5 items-baseline">
                  {[row1, row2, row3].map((pairs, rowIndex) => (
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
                                : label === "상태" && value === PENDING_TIER_LABEL
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
                </dl>
                <dl className="mt-4 grid grid-cols-[5rem_1fr] gap-x-3 gap-y-1.5 items-baseline border-t pt-4">
                  <dt className="shrink-0 text-sm font-medium text-muted-foreground">
                    자기소개
                  </dt>
                  <dd className="min-w-0 flex flex-wrap items-center gap-2">
                    {canEditAsAdmin ? (
                      <Button asChild size="sm" variant="outline" className="shrink-0">
                        <Link href={`/bunnies/${encodeURIComponent(profile.id)}/edit`}>
                          정보수정
                        </Link>
                      </Button>
                    ) : !isViewerRigger ? (
                      <Button asChild size="sm" className="shrink-0">
                        <Link
                          href={`/messages/new?to=${encodeURIComponent(profile.id)}`}
                        >
                          쪽지 보내기
                        </Link>
                      </Button>
                    ) : null}
                  </dd>
                  <dd className="col-start-2 min-w-0">
                    <BioPreview
                      fullText={
                        rawBio === "-"
                          ? "-"
                          : (profile.bio?.trim() ?? "")
                      }
                      previewMaxHeightRem={11}
                    />
                  </dd>
                </dl>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-4xl">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">사진</h2>
          {isOwnProfile && !isSuspended && (
            <Button asChild size="sm" variant="outline">
              <Link href={`/bunnies/${encodeURIComponent(profile.id)}/photos`}>
                사진 등록
              </Link>
            </Button>
          )}
        </div>
        {!hasPhotos ? (
          <p className="mt-2 text-sm text-muted-foreground">
            등록된 사진이 없습니다.
          </p>
        ) : (
          <BunnyPostsFeed
            bunnyProfileId={profile.id}
            sessionUserId={session.user.id}
            isOwnProfile={isOwnProfile}
            initialPosts={initialPosts}
            initialLikeByPhotoId={initialLikeByPhotoId}
            initialHasMore={initialHasMore}
          />
        )}
      </div>
    </div>
  );
}
