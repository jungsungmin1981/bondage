import { auth } from "@workspace/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminImageTabs } from "@/app/admin/images/admin-image-tabs";
import { getWatermarkConfig } from "@/lib/watermark-config";
import { WatermarkForm } from "@/app/watermark/watermark-form";

export default async function AdminWatermarkPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) redirect("/login");

  const initialConfig = await getWatermarkConfig();

  return (
    <div className="space-y-4">
      <AdminImageTabs />
      <div className="min-h-[calc(100svh-3.5rem)] p-4 sm:p-0">
        <h2 className="text-lg font-semibold sm:text-xl">워터마크</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        사진에 표시할 워터마크 유형과 위치를 설정합니다.
      </p>
        <div className="mt-4">
          <WatermarkForm initialConfig={initialConfig} />
        </div>
      </div>
    </div>
  );
}

