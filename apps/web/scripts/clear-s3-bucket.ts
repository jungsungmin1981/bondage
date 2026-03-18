/**
 * S3 버킷 내 모든 객체 삭제 (전체 초기화용).
 * DB 초기화 후 실행 권장.
 * 실행: apps/web 에서 pnpm clear-s3
 */
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");
config({ path: path.join(webRoot, ".env") });
config({ path: path.join(webRoot, ".env.local"), override: true });

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} 환경변수가 설정되지 않았습니다.`);
  return v;
}

async function main() {
  const bucket = getEnv("S3_BUCKET");
  const region = getEnv("S3_REGION");
  const accessKeyId = getEnv("S3_ACCESS_KEY_ID");
  const secretAccessKey = getEnv("S3_SECRET_ACCESS_KEY");

  const s3 = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });

  let totalDeleted = 0;
  let continuationToken: string | undefined;

  do {
    const listRes = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        ContinuationToken: continuationToken,
      }),
    );

    const keys = (listRes.Contents ?? [])
      .map((o) => o.Key)
      .filter((k): k is string => !!k);

    if (keys.length === 0) {
      continuationToken = listRes.NextContinuationToken;
      continue;
    }

    await s3.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: keys.map((Key) => ({ Key })),
          Quiet: true,
        },
      }),
    );

    totalDeleted += keys.length;
    console.log(`삭제: ${keys.length}개 (누적 ${totalDeleted}개)`);
    continuationToken = listRes.NextContinuationToken;
  } while (continuationToken);

  console.log(`S3 버킷 초기화 완료. 총 ${totalDeleted}개 객체 삭제.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
