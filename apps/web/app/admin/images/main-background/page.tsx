import { getMainBackgroundUrl } from "@/lib/main-background-config";
import { MainBackgroundForm } from "./main-background-form";

export default async function AdminMainBackgroundPage() {
  const imageUrl = await getMainBackgroundUrl();

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">메인 백그라운드</h2>
      <p className="text-sm text-muted-foreground">
        메인 화면에 사용할 백그라운드 이미지를 업로드하고 현재 적용된 이미지를 확인합니다.
      </p>
      <MainBackgroundForm initialUrl={imageUrl} />
    </div>
  );
}
