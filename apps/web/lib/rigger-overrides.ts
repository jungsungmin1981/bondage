/**
 * rigger-overrides: 파일 기반에서 DB(member_profiles) 기반으로 이전.
 * markImageUrl, profileVisibility 는 member_profiles 테이블에 직접 저장.
 */
import { updateMemberProfile, getRiggerProfileById } from "@workspace/db";

export type RiggerOverride = {
  markImageUrl?: string | null;
  division?: string | null;
  bunnyRecruit?: string | null;
  bondageRating?: string | null;
  activityRegion?: string | null;
  style?: string | null;
  bio?: string | null;
  profileVisibility?: "public" | "private" | null;
};

/** 단일 리거 override 조회 — DB에서 바로 읽음 (파일 I/O 없음) */
export async function getRiggerOverride(
  riggerId: string,
): Promise<RiggerOverride | null> {
  const profile = await getRiggerProfileById(riggerId);
  if (!profile) return null;
  return {
    markImageUrl: profile.markImageUrl ?? null,
    division: profile.division ?? null,
    bunnyRecruit: profile.bunnyRecruit ?? null,
    bondageRating: profile.bondageRating ?? null,
    activityRegion: profile.activityRegion ?? null,
    style: profile.style ?? null,
    bio: profile.bio ?? null,
    profileVisibility: (profile.profileVisibility as "public" | "private" | null) ?? null,
  };
}

/** 리거 override 저장 — updateMemberProfile로 DB에 반영 */
export async function saveRiggerOverride(
  riggerId: string,
  patch: RiggerOverride,
): Promise<void> {
  const profile = await getRiggerProfileById(riggerId);
  if (!profile) throw new Error(`리거 프로필 없음: ${riggerId}`);

  await updateMemberProfile(profile.userId, {
    markImageUrl: patch.markImageUrl,
    division: patch.division,
    bunnyRecruit: patch.bunnyRecruit,
    bondageRating: patch.bondageRating,
    activityRegion: patch.activityRegion,
    style: patch.style,
    bio: patch.bio,
    profileVisibility: patch.profileVisibility,
  });
}
