import { DonationCardPreviewSection } from "./donation-card-preview";

export default function AdminDonationPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">기부 카드 미리보기</h2>
      <p className="text-sm text-muted-foreground">
        기부 카드 이미지를 업로드하고, 브론즈 등급 카드와 동일한 레이아웃으로 미리보기합니다.
      </p>
      <DonationCardPreviewSection />
    </div>
  );
}
