import { auth } from "@workspace/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getWatermarkConfig } from "@/lib/watermark-config";
import { WatermarkForm } from "./watermark-form";

export default async function WatermarkPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) redirect("/login");

  const initialConfig = await getWatermarkConfig();

  return (
    <div className="min-h-[calc(100svh-3.5rem)] p-4 sm:p-6">
      <h1 className="text-xl font-semibold sm:text-2xl">워터마크</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        사진에 표시할 워터마크 유형과 위치를 설정합니다.
      </p>
      <WatermarkForm initialConfig={initialConfig} />
    </div>
  );
}
