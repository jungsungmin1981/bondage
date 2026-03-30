import { TierConditionsTabs } from "./tier-conditions-tabs";

export default function AdminTierConditionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-lg font-semibold">등급 조건 설정</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        각 등급에서 별을 획득하기 위한 조건입니다. 임계값을 수정하면 즉시 반영됩니다.
      </p>
      <TierConditionsTabs />
      {children}
    </div>
  );
}
