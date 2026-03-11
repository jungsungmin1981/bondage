import Link from "next/link";
import { Fragment } from "react";
import { auth } from "@workspace/auth";
import { getBunnyProfileById } from "@workspace/db";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import { BunnyCard } from "@/components/bunny-card";
import { BioPreview } from "@/app/rigger/[id]/bio-preview";
import { BunnyProfileInline } from "./bunny-profile-inline";
import { OwnBunnyCardColumn } from "./own-bunny-card-column";

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
  const profile = await getBunnyProfileById(id);
  if (!profile) notFound();

  const name = (
    profile.nickname?.trim() ||
    profile.userName?.trim() ||
    "버니"
  ).slice(0, 50);
  const isOwnProfile = profile.userId === session.user.id;

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
            cardImageUrl={profile.cardImageUrl}
          />
        ) : (
          <div className="flex justify-center sm:col-start-1 sm:row-start-1 sm:justify-start">
            <div className="w-full max-w-[280px]">
              <BunnyCard cardImageUrl={profile.cardImageUrl} />
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
                                ? "min-w-0 overflow-hidden text-lg font-medium"
                                : label === "상태" && value === PENDING_TIER_LABEL
                                  ? "min-w-0 text-lg font-medium text-blue-600"
                                  : "min-w-0 text-lg font-medium"
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
                    <Button asChild size="sm" className="shrink-0">
                      <Link
                        href={`/messages/new?to=${encodeURIComponent(profile.id)}`}
                      >
                        쪽지 보내기
                      </Link>
                    </Button>
                  </dd>
                  <dd className="col-start-2 min-w-0">
                    <BioPreview
                      fullText={
                        rawBio === "-"
                          ? "-"
                          : (profile.bio?.trim() ?? "")
                      }
                    />
                  </dd>
                </dl>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-4xl">
        <h2 className="text-sm font-medium text-muted-foreground">사진</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          등록된 사진이 없습니다.
        </p>
      </div>
    </div>
  );
}
