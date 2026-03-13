import { PutObjectCommand } from "@aws-sdk/client-s3";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@workspace/auth";
import { getS3Config } from "@/lib/s3";
import { resizeToJpeg } from "@/lib/image/resize";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";

function randomId() {
  return crypto.randomUUID();
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!isAdmin(session)) {
    return NextResponse.json({ ok: false, error: "관리자만 업로드할 수 있습니다." }, { status: 403 });
  }

  let s3: ReturnType<typeof getS3Config>["s3"];
  let bucket: string;
  let publicBaseUrl: string;
  try {
    ({ s3, bucket, publicBaseUrl } = getS3Config());
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "S3 설정이 필요합니다." },
      { status: 500 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  const challengeId = String(form.get("challengeId") ?? "").trim();

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "file이 필요합니다." }, { status: 400 });
  }
  if (!challengeId) {
    return NextResponse.json({ ok: false, error: "challengeId가 필요합니다." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { ok: false, error: "이미지 파일만 업로드할 수 있습니다." },
      { status: 400 },
    );
  }

  const bytes = await file.arrayBuffer();
  const inputBuffer = Buffer.from(bytes);
  const resizedBuffer = await resizeToJpeg(inputBuffer);
  const ext = "jpg";
  const key = `challenge-rejection/${challengeId}/${randomId()}.${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: resizedBuffer,
      ContentType: "image/jpeg",
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  const url = `${publicBaseUrl}/${key}`;
  return NextResponse.json({ ok: true, url });
}
