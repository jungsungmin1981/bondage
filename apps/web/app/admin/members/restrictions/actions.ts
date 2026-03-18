"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@workspace/auth";
import {
  searchMemberProfilesByNickname,
  insertSuspension,
  liftSuspension,
  getActiveSuspensionForUser,
  getRiggerProfileById,
  getBunnyProfileById,
  insertDirectMessage,
  DIRECT_MESSAGE_SOURCE,
  getMemberProfileByUserId,
  getOperatorAllowedTabIds,
} from "@workspace/db";
import { isAdmin } from "@/lib/admin";
import { isOperatorAllowedPath } from "@/lib/admin-operator-permissions";
import { mapRiggerProfileToRigger } from "@/lib/rigger-from-db";
import type { Rigger } from "@/lib/rigger-sample";

const RESTRICTIONS_PATH = "/admin/members/restrictions";

async function canAccessRestrictions(): Promise<boolean> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return false;
  if (isAdmin(session)) return true;
  const profile = await getMemberProfileByUserId(session.user.id);
  const isApprovedOperator =
    profile?.memberType === "operator" && profile?.status === "approved";
  if (!isApprovedOperator) return false;
  const allowedIds = await getOperatorAllowedTabIds(session.user.id);
  return isOperatorAllowedPath(allowedIds, RESTRICTIONS_PATH);
}

export type MemberSearchItem = {
  id: string;
  userId: string;
  nickname: string;
  memberType: string;
};

export async function searchMembersByNicknameAction(
  query: string,
): Promise<
  | { ok: true; items: MemberSearchItem[] }
  | { ok: false; error: string }
> {
  if (!(await canAccessRestrictions())) {
    return { ok: false, error: "관리자만 검색할 수 있습니다." };
  }
  const items = await searchMemberProfilesByNickname(query);
  return { ok: true, items };
}

export async function applySuspensionAction(
  userId: string,
  durationDays: number | null,
  reason?: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "로그인이 필요합니다." };
  if (!(await canAccessRestrictions())) {
    return { ok: false, error: "관리자만 이용제한을 부여할 수 있습니다." };
  }
  const validDurations = [1, 3, 5, 10, 15, 30];
  if (
    durationDays !== null &&
    (!Number.isInteger(durationDays) || !validDurations.includes(durationDays))
  ) {
    return { ok: false, error: "잘못된 기간입니다." };
  }
  const result = await insertSuspension({
    userId,
    durationDays,
    reason: reason?.trim() || null,
    createdByUserId: session.user.id,
  });
  if (!result.ok) return result;

  const now = new Date();
  const suspendedUntil =
    durationDays == null
      ? null
      : new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
  const periodText =
    durationDays == null ? "영구정지" : `${durationDays}일`;
  const untilText =
    suspendedUntil == null
      ? "해제 예정일 없음 (영구정지)"
      : suspendedUntil.toLocaleString("ko-KR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });
  const reasonText = reason?.trim() || "없음";
  const body = [
    "계정 사용 제한이 적용되었습니다.",
    "",
    `정지 기간: ${periodText}`,
    `해제 예정: ${untilText}`,
    `사유: ${reasonText}`,
  ].join("\n");

  try {
    await insertDirectMessage({
      fromUserId: session.user.id,
      toUserId: userId,
      title: "계정 사용 제한",
      body,
      source: DIRECT_MESSAGE_SOURCE.SUSPENSION_NOTICE,
    });
  } catch {
    // 쪽지 실패해도 정지 적용은 유지
  }

  revalidatePath("/admin/members/restrictions");
  return result;
}

export async function liftSuspensionAction(
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await canAccessRestrictions())) {
    return { ok: false, error: "관리자만 정지 해제할 수 있습니다." };
  }
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "로그인이 필요합니다." };
  const result = await liftSuspension(userId);
  if (result.ok) {
    revalidatePath("/admin/members/restrictions");
  }
  return result;
}

export type MemberCardForRestriction =
  | { memberType: "rigger"; rigger: Rigger; suspended?: boolean }
  | { memberType: "bunny"; cardImageUrl: string | null; suspended?: boolean };

export async function getMemberCardForRestrictionAction(
  profileId: string,
  memberType: string,
): Promise<
  | { ok: true; card: MemberCardForRestriction }
  | { ok: false; error: string }
> {
  if (!(await canAccessRestrictions())) {
    return { ok: false, error: "관리자만 조회할 수 있습니다." };
  }
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "로그인이 필요합니다." };
  if (memberType === "rigger") {
    const profile = await getRiggerProfileById(profileId);
    if (!profile) {
      return { ok: false, error: "해당 리거 프로필을 찾을 수 없습니다." };
    }
    const [rigger, suspension] = await Promise.all([
      Promise.resolve(mapRiggerProfileToRigger(profile)),
      getActiveSuspensionForUser(profile.userId),
    ]);
    return {
      ok: true,
      card: { memberType: "rigger", rigger, suspended: !!suspension },
    };
  }
  if (memberType === "bunny") {
    const profile = await getBunnyProfileById(profileId);
    if (!profile) {
      return { ok: false, error: "해당 버니 프로필을 찾을 수 없습니다." };
    }
    const suspension = await getActiveSuspensionForUser(profile.userId);
    return {
      ok: true,
      card: {
        memberType: "bunny",
        cardImageUrl: profile.cardImageUrl ?? null,
        suspended: !!suspension,
      },
    };
  }
  return { ok: false, error: "알 수 없는 회원 구분입니다." };
}
