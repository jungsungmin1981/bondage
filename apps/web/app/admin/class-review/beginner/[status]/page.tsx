import { notFound } from "next/navigation";
import {
  getChallengesForReviewByLevel,
  getProcessorDecisionsByChallengeIds,
  getRejectionDetailsByChallengeIds,
} from "@workspace/db";
import { AdminClassReviewStatusTabs } from "../../admin-class-review-status-tabs";
import { ClassReviewChallengeList } from "../../class-review-challenge-list";

const VALID_STATUSES = ["pending", "approved", "rejected"] as const;

export default async function AdminClassReviewBeginnerStatusPage({
  params,
}: {
  params: Promise<{ status: string }>;
}) {
  const { status } = await params;
  if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    notFound();
  }
  const typedStatus = status as "pending" | "approved" | "rejected";

  const items = await getChallengesForReviewByLevel("beginner", {
    status: typedStatus,
  });
  const challengeIds = items.map((i) => i.challengeId);
  const [processorMap, rejectionMap] = await Promise.all([
    getProcessorDecisionsByChallengeIds(challengeIds),
    typedStatus === "rejected"
      ? getRejectionDetailsByChallengeIds(challengeIds)
      : Promise.resolve(new Map()),
  ]);
  const itemsWithProcessors = items.map((item) => {
    const rejection = rejectionMap.get(item.challengeId);
    return {
      ...item,
      processorDecisions: processorMap.get(item.challengeId) ?? [],
      ...(rejection && {
        rejectionNote: rejection.rejectionNote,
        rejectionImageUrls: rejection.rejectionImageUrls,
      }),
    };
  });

  return (
    <>
      <AdminClassReviewStatusTabs levelPath="beginner" currentStatus={typedStatus} />
      <ClassReviewChallengeList
        items={itemsWithProcessors}
        levelLabel="초급"
        statusFilter={typedStatus}
      />
    </>
  );
}
