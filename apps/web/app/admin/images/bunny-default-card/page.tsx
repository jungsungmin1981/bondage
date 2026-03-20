import { getBunnyDefaultCardUrl } from "@/lib/bunny-default-card-config";
import { BunnyDefaultCardForm } from "./bunny-default-card-form";

export default function AdminBunnyDefaultCardPage() {
  const imageUrl = getBunnyDefaultCardUrl();

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">버니 기본 카드</h2>
      <p className="text-sm text-muted-foreground">
        버니 회원이 카드 이미지를 등록하지 않았을 때 표시되는 기본 카드 이미지를 설정합니다.
      </p>
      <BunnyDefaultCardForm initialUrl={imageUrl} />
    </div>
  );
}
