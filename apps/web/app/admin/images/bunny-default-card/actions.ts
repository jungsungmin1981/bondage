"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@workspace/auth";
import { resizeCardToPng } from "@/lib/image/resize";
import { uploadBufferToS3 } from "@/lib/s3-upload";
import { BUNNY_DEFAULT_CARD_S3_KEY } from "@/lib/bunny-default-card-config";

export async function uploadBunnyDefaultCardImage(
  formData: FormData,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) return { ok: false, error: "로그인이 필요합니다." };

  const file = formData.get("image") as File | null;
  if (!file || !(file instanceof File))
    return { ok: false, error: "이미지 파일을 선택해 주세요." };

  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type))
    return { ok: false, error: "JPEG, PNG, WebP만 업로드할 수 있습니다." };

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const resized = await resizeCardToPng(buffer);
    const url = await uploadBufferToS3(BUNNY_DEFAULT_CARD_S3_KEY, resized, "image/png");
    revalidatePath("/bunnies");
    revalidatePath("/admin/images/bunny-default-card");
    return { ok: true, url };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "이미지 저장에 실패했습니다.",
    };
  }
}
