import { AdminClassReviewTabs } from "./admin-class-review-tabs";

export default function AdminClassReviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">클래스 심사</h1>
        <p className="text-sm text-muted-foreground">
          도전 신청을 레벨별로 확인하고 승인/반려 처리합니다.
        </p>
      </div>
      <AdminClassReviewTabs />
      {children}
    </div>
  );
}
