import { MasterCardPreviewSection } from "./master-card-preview";

export default function AdminMasterPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">마스터(레전드) 등급 카드 미리보기</h2>
      <p className="text-sm text-muted-foreground">
        레전드(마스터) 등급 리거 상세 페이지에서 보이는 카드와 동일한 레이아웃으로 미리보기합니다.
      </p>
      <MasterCardPreviewSection />
    </div>
  );
}
