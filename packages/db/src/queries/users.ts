import { eq, inArray } from "drizzle-orm";
import { db } from "../client/node";
import * as schema from "../schema";

/**
 * 사용자 회원 구분값 설정. 세션에 노출되어 미들웨어에서 사용.
 */
export async function setUserMemberType(
  userId: string,
  memberType: "rigger" | "bunny",
): Promise<void> {
  await db
    .update(schema.users)
    .set({ memberType, updatedAt: new Date() })
    .where(eq(schema.users.id, userId));
}

/**
 * 이메일 목록에 해당하는 사용자 id 목록을 반환합니다.
 */
export async function getUserIdListByEmails(emails: string[]): Promise<string[]> {
  if (emails.length === 0) return [];
  const rows = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(inArray(schema.users.email, emails));
  return rows.map((r) => r.id).filter((id): id is string => Boolean(id));
}
