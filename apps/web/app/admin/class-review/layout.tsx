import { getPendingChallengeCountsByLevel } from "@workspace/db";
import { AdminClassSectionTabs } from "../admin-class-section-tabs";
import { AdminClassReviewTabs } from "./admin-class-review-tabs";

export default async function AdminClassReviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pending = await getPendingChallengeCountsByLevel();
  const hasOther = pending.other > 0;

  return (
    <div className="space-y-4">
      <AdminClassSectionTabs
        hasPendingClassReview={
          pending.beginner > 0 || pending.intermediate > 0 || pending.advanced > 0
        }
      />
      <div>
        <h1 className="text-lg font-semibold">클래스 심사</h1>
        <p className="text-sm text-muted-foreground">
          도전 신청을 레벨별로 확인하고 승인/반려 처리합니다.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          심사중(pending): 초급 {pending.beginner}건, 중급 {pending.intermediate}건, 고급{" "}
          {pending.advanced}건
          {hasOther && (
            <span className="text-amber-600 dark:text-amber-400">
              {" "}
              · 기타 레벨 {pending.other}건 (목록에 안 나올 수 있음)
            </span>
          )}
        </p>
      </div>
      <AdminClassReviewTabs
        pendingCounts={{
          beginner: pending.beginner,
          intermediate: pending.intermediate,
          advanced: pending.advanced,
        }}
      />
      {children}
    </div>
  );
}
