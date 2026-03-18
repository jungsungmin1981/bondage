import { eq } from "drizzle-orm";
import { db } from "../client/node";
import * as schema from "../schema";

export const OPERATOR_TAB_IDS = [
  "operators",
  "members",
  "class",
  "notice",
  "images",
] as const;
export type OperatorTabId = (typeof OPERATOR_TAB_IDS)[number];

/** 탭별 하위 메뉴 ID (path prefix 또는 식별자) */
export const OPERATOR_SUB_IDS: Record<OperatorTabId, readonly string[]> = {
  operators: [],
  members: ["riggers", "restrictions"],
  class: ["beginner", "intermediate", "advanced"],
  notice: ["rigger", "qna", "bunny", "bunny-qna"],
  images: ["watermark", "main-background", "resize", "bronze", "silver", "gold", "master", "jail", "donation"],
};

export function isValidOperatorTabId(id: string): id is OperatorTabId {
  return OPERATOR_TAB_IDS.includes(id as OperatorTabId);
}

/** tabId 또는 tabId:subId 형식 유효 여부 */
export function isValidOperatorTabOrSubId(id: string): boolean {
  if (OPERATOR_TAB_IDS.includes(id as OperatorTabId)) return true;
  const [tab, sub] = id.split(":");
  if (!tab || !sub) return false;
  const subs = OPERATOR_SUB_IDS[tab as OperatorTabId];
  return subs != null && subs.includes(sub);
}

/** 운영진이 접근 허용된 관리자 탭 ID 목록 (상위 탭만, 하위 미지정 시 사용) */
export async function getOperatorAllowedTabs(
  userId: string,
): Promise<OperatorTabId[]> {
  const ids = await getOperatorAllowedTabIds(userId);
  return [...new Set(ids.map((id) => (id.includes(":") ? (id.split(":")[0] as OperatorTabId) : id)))].filter(
    (id): id is OperatorTabId => isValidOperatorTabId(id),
  );
}

/** 운영진이 접근 허용된 탭/하위 ID 목록 (tabId 또는 tabId:subId) */
export async function getOperatorAllowedTabIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ tabId: schema.operatorAdminTabs.tabId })
    .from(schema.operatorAdminTabs)
    .where(eq(schema.operatorAdminTabs.userId, userId));
  return rows.map((r) => r.tabId).filter((id) => isValidOperatorTabOrSubId(id));
}

/** 운영진 관리자 탭 권한 일괄 설정 (기존 건 삭제 후 삽입). tabIds: OperatorTabId[] 또는 tabId:subId */
export async function setOperatorAllowedTabs(
  userId: string,
  tabIds: string[],
): Promise<void> {
  const valid = tabIds.filter((id) => isValidOperatorTabOrSubId(id));
  await db
    .delete(schema.operatorAdminTabs)
    .where(eq(schema.operatorAdminTabs.userId, userId));
  if (valid.length > 0) {
    await db.insert(schema.operatorAdminTabs).values(
      valid.map((tabId) => ({ userId, tabId })),
    );
  }
}
