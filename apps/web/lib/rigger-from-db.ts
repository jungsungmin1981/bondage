import type { RiggerProfileWithUser } from "@workspace/db";
import type { Rigger } from "@/lib/rigger-sample";

function fallbackFromName(name: string): string {
  if (name.length >= 2) return name.slice(0, 2);
  return name.slice(0, 1);
}

/**
 * DB 리거 프로필(member_profile + user)을 Rigger 타입으로 변환.
 * 등급은 최초 브론즈로 고정.
 * 표시 이름은 회원이 입력한 닉네임만 사용(users.name/아이디 fallback 제거).
 */
export function mapRiggerProfileToRigger(p: RiggerProfileWithUser): Rigger {
  const name = (p.nickname?.trim() || "리거").slice(0, 50);
  return {
    id: p.id,
    name,
    tier: "bronze",
    avatarFallback: fallbackFromName(name),
    avatarUrl: p.iconUrl ?? null,
    userId: p.userId,
    division: p.division ?? null,
    bunnyRecruit: p.bunnyRecruit ?? null,
    bondageRating: p.bondageRating ?? null,
    activityRegion: p.activityRegion ?? null,
    style: p.style ?? null,
    bio: p.bio ?? null,
    gender: p.gender ?? null,
    markImageUrl: p.markImageUrl ?? null,
    profileVisibility: (p.profileVisibility as "public" | "private" | null) ?? null,
  };
}
