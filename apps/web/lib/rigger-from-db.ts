import type { RiggerProfileWithUser } from "@workspace/db";
import type { Rigger } from "@/lib/rigger-sample";

function fallbackFromName(name: string): string {
  if (name.length >= 2) return name.slice(0, 2);
  return name.slice(0, 1);
}

/**
 * DB 리거 프로필(member_profile + user)을 Rigger 타입으로 변환.
 * tier, stars는 DB에 저장된 값을 사용.
 * 표시 이름은 회원이 입력한 닉네임만 사용(users.name/아이디 fallback 제거).
 */
export function mapRiggerProfileToRigger(p: RiggerProfileWithUser): Rigger {
  const name = (p.nickname?.trim() || "리거").slice(0, 50);
  const validTiers = ["bronze", "silver", "gold", "legend"] as const;
  const tier = validTiers.includes((p.tier ?? "bronze") as typeof validTiers[number])
    ? ((p.tier ?? "bronze") as typeof validTiers[number])
    : "bronze";
  return {
    id: p.id,
    name,
    tier,
    stars: typeof p.stars === "number" ? p.stars : 0,
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
