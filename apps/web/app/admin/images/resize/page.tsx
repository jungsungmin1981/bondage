import { ResizeStaticImagesSection } from "./resize-static-images-section";

export default function AdminResizeImagePage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">고정 이미지 리사이징</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          소스에 포함된 고정 이미지를 실제 사용 크기(×2, 최대 1600px)에 맞춰
          일괄 리사이즈합니다. 개발 시 리소스 정리용입니다.
        </p>
      </div>
      <ResizeStaticImagesSection />
    </div>
  );
}
