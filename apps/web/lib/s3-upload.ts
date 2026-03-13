import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getS3Config } from "@/lib/s3";

/**
 * 버퍼를 S3에 업로드하고 공개 URL 반환.
 * 서버 액션 등에서 호출. S3 미설정 시 getS3Config()에서 throw.
 */
export async function uploadBufferToS3(
  key: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const { s3, bucket, publicBaseUrl } = getS3Config();
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return `${publicBaseUrl}/${key}`;
}
