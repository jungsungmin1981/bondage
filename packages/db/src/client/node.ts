import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../schema";

const connectionString = process.env.DATABASE_URL
  ? process.env.DATABASE_URL
  : `postgresql://${process.env.DATABASE_USER}:${encodeURIComponent(process.env.DATABASE_PASSWORD ?? "")}@${process.env.DATABASE_HOST}:${process.env.DATABASE_PORT}/${process.env.DATABASE_NAME}`;

/**
 * Next.js dev/HMR 시 모듈이 여러 번 로드되며 postgres()가 반복 생성되면
 * "Max client connections reached"가 난다. process/global 싱글톤으로 풀 1개만 쓴다.
 * 무료/공유 DB는 max_connections가 낮으므로 max도 작게 둔다.
 */
const globalForDb = globalThis as unknown as {
  __postgresClient?: ReturnType<typeof postgres>;
};

/**
 * postgres.js는 max로 풀 크기 배열을 만든다. NaN/과대 값이면 RangeError: Invalid array length 발생.
 * env가 비어 있거나 이상한 값이어도 항상 1~20 사이 정수만 넘긴다.
 */
function parsePoolMax(): number {
  const raw = String(process.env.DATABASE_POOL_MAX ?? "5").trim();
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return 5;
  return Math.min(n, 20);
}

const max = parsePoolMax();

function createClient() {
  if (!connectionString || connectionString.includes("undefined")) {
    throw new Error(
      "DATABASE_URL 또는 DATABASE_HOST/USER/PASSWORD/NAME 이 설정되지 않았습니다.",
    );
  }
  return postgres(connectionString, {
    max,
    idle_timeout: 20,
    connect_timeout: 10,
  });
}

const client = globalForDb.__postgresClient ?? createClient();
if (process.env.NODE_ENV !== "production") {
  globalForDb.__postgresClient = client;
}

export const db = drizzle(client, { schema });
