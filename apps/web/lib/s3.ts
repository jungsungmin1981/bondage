import { S3Client } from "@aws-sdk/client-s3";

function must(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} 환경변수가 설정되지 않았습니다.`);
  return v;
}

export function getS3Config() {
  const bucket = must("S3_BUCKET");
  const publicBaseUrl = must("S3_PUBLIC_BASE_URL").replace(/\/$/, "");
  const region = must("S3_REGION");
  const accessKeyId = must("S3_ACCESS_KEY_ID");
  const secretAccessKey = must("S3_SECRET_ACCESS_KEY");

  const s3 = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });

  return { s3, bucket, publicBaseUrl };
}

