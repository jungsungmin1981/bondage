import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";

function getDataDirSync(): string {
  const cwd = process.cwd();
  const nested = path.join(cwd, "apps", "web", "data");
  const local = path.join(cwd, "data");
  // 레포 루트에서 turbo 실행 시 apps/web/data 사용
  if (fs.existsSync(path.join(cwd, "apps", "web"))) return nested;
  return local;
}

export type RiggerOverride = {
  /** 등급카드 원형 마크 이미지 URL */
  markImageUrl?: string | null;
  division?: string | null;
  bunnyRecruit?: string | null;
  bondageRating?: string | null;
  activityRegion?: string | null;
  /** 쉼표 구분 복수 스타일 */
  style?: string | null;
  bio?: string | null;
};

const DATA_PATH = path.join(getDataDirSync(), "rigger-overrides.json");

async function readAll(): Promise<Record<string, RiggerOverride>> {
  try {
    const raw = await fsPromises.readFile(DATA_PATH, "utf-8");
    return JSON.parse(raw) as Record<string, RiggerOverride>;
  } catch {
    return {};
  }
}

export async function getRiggerOverride(
  riggerId: string,
): Promise<RiggerOverride | null> {
  const all = await readAll();
  return all[riggerId] ?? null;
}

export async function saveRiggerOverride(
  riggerId: string,
  patch: RiggerOverride,
): Promise<void> {
  const all = await readAll();
  const prev = all[riggerId] ?? {};
  const next: Record<string, string | null> = { ...prev };
  // undefined는 병합하지 않음 — JSON.stringify가 undefined 키를 제거해
  // 기존 division 등이 파일에서 사라지는 문제 방지
  for (const [k, v] of Object.entries(patch) as [keyof RiggerOverride, string | null | undefined][]) {
    if (v !== undefined) next[k as string] = v;
  }
  all[riggerId] = next as RiggerOverride;
  await fsPromises.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fsPromises.writeFile(
    DATA_PATH,
    JSON.stringify(all, null, 2),
    "utf-8",
  );
}
