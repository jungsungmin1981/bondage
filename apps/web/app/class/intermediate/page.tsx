import { auth } from "@workspace/auth";
import {
  getChallengeCountsByPostIds,
  getMyChallengeStatusByPostIds,
  getPublicClassPostsByLevel,
} from "@workspace/db";
import { headers } from "next/headers";
import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";
import { ClassImagePreviewClient } from "../beginner/class-image-preview-client";
import type { ClassCard as ClassCardType } from "../beginner/data";

const getCachedIntermediatePosts = unstable_cache(
  () => getPublicClassPostsByLevel("intermediate"),
  ["class-posts-intermediate"],
  { revalidate: 60 },
);

export default async function ClassIntermediatePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) redirect("/login");

  const rows = await getCachedIntermediatePosts();
  const postIds = rows.map((r) => r.id);
  const [statusMap, countsMap] =
    postIds.length > 0
      ? await Promise.all([
          getMyChallengeStatusByPostIds(session.user.id, postIds),
          getChallengeCountsByPostIds(postIds),
        ])
      : [
          new Map<string, "pending" | "approved" | "rejected">(),
          new Map<string, { approved: number; pending: number; rejected: number }>(),
        ];

  const cards: ClassCardType[] = rows.map((r) => {
    const counts = countsMap.get(r.id) ?? { approved: 0, pending: 0, rejected: 0 };
    return {
      id: r.id,
      visibility: r.visibility as "public" | "private",
      title: r.title,
      description: r.description,
      ropeThicknessMm: r.ropeThicknessMm,
      ropeLengthM: r.ropeLengthM,
      quantity: r.quantity,
      imageUrl: r.coverImageUrl,
      extraImageUrls: (r.extraImageUrls as string[]) ?? [],
      videoUrl: (r.videoUrl as string | null | undefined) ?? undefined,
      myChallengeStatus: statusMap.get(r.id),
      challengeApprovedCount: counts.approved,
      challengePendingCount: counts.pending,
      challengeRejectedCount: counts.rejected,
    };
  });

  return (
    <div className="min-h-[calc(100svh-3.5rem)] bg-background p-4 sm:p-6">
      <h1 className="text-xl font-semibold sm:text-2xl">클래스 · 중급</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        중급 클래스 콘텐츠를 카드에서 선택해 보세요.
      </p>
      {cards.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          등록된 중급 클래스가 없습니다. (관리자에서 공개로 등록해 주세요.)
        </p>
      ) : (
        <ClassImagePreviewClient cards={cards} />
      )}
    </div>
  );
}
