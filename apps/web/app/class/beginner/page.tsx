import { auth } from "@workspace/auth";
import {
  getChallengesByUserForPostIds,
  getPublicClassPostsByLevel,
} from "@workspace/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ClassImagePreviewClient } from "./class-image-preview-client";
import type { ClassCard as ClassCardType } from "./data";

export default async function ClassBeginnerPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) redirect("/login");

  const rows = await getPublicClassPostsByLevel("beginner");
  const postIds = rows.map((r) => r.id);
  const myChallenges =
    postIds.length > 0
      ? await getChallengesByUserForPostIds(session.user.id, postIds)
      : [];
  const challengedIds = new Set(myChallenges.map((c) => c.classPostId));

  const cards: ClassCardType[] = rows.map((r) => ({
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
    hasMyChallenge: challengedIds.has(r.id),
  }));

  return (
    <div className="min-h-[calc(100svh-3.5rem)] bg-white p-4 sm:p-6">
      <h1 className="text-xl font-semibold sm:text-2xl">클래스 · 초급</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        초급 클래스 콘텐츠를 카드에서 선택해 보세요.
      </p>
      {cards.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          등록된 초급 클래스가 없습니다. (관리자에서 공개로 등록해 주세요.)
        </p>
      ) : (
        <ClassImagePreviewClient cards={cards} />
      )}
    </div>
  );
}
