import {
  getChallengesForReviewByLevel,
  getProcessorDecisionsByChallengeIds,
} from "@workspace/db";
import { ClassReviewChallengeList } from "../class-review-challenge-list";

export default async function AdminClassReviewBeginnerPage() {
  const items = await getChallengesForReviewByLevel("beginner");
  const challengeIds = items.map((i) => i.challengeId);
  const processorMap = await getProcessorDecisionsByChallengeIds(challengeIds);
  const itemsWithProcessors = items.map((item) => ({
    ...item,
    processorDecisions: processorMap.get(item.challengeId) ?? [],
  }));
  return (
    <ClassReviewChallengeList items={itemsWithProcessors} levelLabel="초급" />
  );
}
