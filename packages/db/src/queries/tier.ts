import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "../client/node";
import * as schema from "../schema";

export type TierConditionRow = {
  id: string;
  tier: string;
  conditionType: string;
  threshold: number;
  starIndex: number;
  label: string;
};

/** 특정 등급의 별 조건 목록 (starIndex 오름차순) */
export async function getTierConditionsByTier(
  tier: string,
): Promise<TierConditionRow[]> {
  const rows = await db
    .select({
      id: schema.tierConditions.id,
      tier: schema.tierConditions.tier,
      conditionType: schema.tierConditions.conditionType,
      threshold: schema.tierConditions.threshold,
      starIndex: schema.tierConditions.starIndex,
      label: schema.tierConditions.label,
    })
    .from(schema.tierConditions)
    .where(eq(schema.tierConditions.tier, tier))
    .orderBy(asc(schema.tierConditions.starIndex));
  return rows;
}

/** 특정 조건의 임계값(threshold) 수정 */
export async function updateTierConditionThreshold(
  id: string,
  threshold: number,
): Promise<void> {
  await db
    .update(schema.tierConditions)
    .set({ threshold, updatedAt: new Date() })
    .where(eq(schema.tierConditions.id, id));
}

const TIER_ORDER = ["bronze", "silver", "gold", "legend"] as const;
type Tier = (typeof TIER_ORDER)[number];

function nextTier(tier: string): Tier | null {
  const idx = TIER_ORDER.indexOf(tier as Tier);
  if (idx === -1 || idx >= TIER_ORDER.length - 1) return null;
  return TIER_ORDER[idx + 1] ?? null;
}

/**
 * 실제 별 계산 수행 (tier 고정, DB 저장 없음).
 * 외부에서 수집한 publicPosts / totalLikes / clearRates를 받아 계산만 반환.
 */
function countStars(
  conditions: TierConditionRow[],
  publicPosts: number,
  totalLikes: number,
  beginnerClearRate: number,
  intermediateClearRate: number,
  advancedClearRate: number,
): number {
  let stars = 0;
  for (const cond of conditions) {
    let met = false;
    if (cond.conditionType === "first_post" || cond.conditionType === "post_count") {
      met = publicPosts >= cond.threshold;
    } else if (cond.conditionType === "total_likes") {
      met = totalLikes >= cond.threshold;
    } else if (cond.conditionType === "class_clear_rate") {
      met = beginnerClearRate >= cond.threshold;
    } else if (cond.conditionType === "intermediate_class_clear") {
      met = intermediateClearRate >= cond.threshold;
    } else if (cond.conditionType === "advanced_class_clear") {
      met = advancedClearRate >= cond.threshold;
    }
    if (met) stars++;
  }
  return stars;
}

/**
 * 특정 리거 프로필의 tier/stars를 자동 계산해 member_profiles에 저장.
 * 현재 등급의 별이 모두 채워지면(5개) 자동으로 다음 등급으로 승급합니다.
 * - profileId: member_profiles.id
 * - userId: member_profiles.user_id (class_challenges 조회용)
 */
export async function recalculateRiggerStars(
  profileId: string,
  userId: string,
): Promise<number> {
  // 현재 등급 조회
  const [profile] = await db
    .select({ tier: schema.memberProfiles.tier })
    .from(schema.memberProfiles)
    .where(eq(schema.memberProfiles.id, profileId))
    .limit(1);
  if (!profile) return 0;

  // --- 공통 데이터 수집 (한 번만) ---
  const [publicPostCount] = await db
    .select({ count: sql<number>`count(distinct ${schema.riggerPhotos.postId})::int` })
    .from(schema.riggerPhotos)
    .where(
      and(
        eq(schema.riggerPhotos.riggerId, profileId),
        eq(schema.riggerPhotos.visibility, "public"),
      ),
    );

  const [totalLikesRow] = await db
    .select({
      total: sql<number>`count(distinct ${schema.postLikes.id})::int`,
    })
    .from(schema.postLikes)
    .innerJoin(
      schema.riggerPhotos,
      eq(schema.postLikes.postId, schema.riggerPhotos.postId),
    )
    .where(
      and(
        eq(schema.riggerPhotos.riggerId, profileId),
        eq(schema.riggerPhotos.visibility, "public"),
      ),
    );

  const [totalBeginnerCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.classPosts)
    .where(
      and(
        eq(schema.classPosts.level, "beginner"),
        eq(schema.classPosts.visibility, "public"),
      ),
    );

  const [approvedBeginnerCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.classChallenges)
    .innerJoin(
      schema.classPosts,
      eq(schema.classChallenges.classPostId, schema.classPosts.id),
    )
    .where(
      and(
        eq(schema.classChallenges.userId, userId),
        eq(schema.classChallenges.status, "approved"),
        eq(schema.classPosts.level, "beginner"),
      ),
    );

  const [totalIntermediateCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.classPosts)
    .where(
      and(
        eq(schema.classPosts.level, "intermediate"),
        eq(schema.classPosts.visibility, "public"),
      ),
    );

  const [approvedIntermediateCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.classChallenges)
    .innerJoin(
      schema.classPosts,
      eq(schema.classChallenges.classPostId, schema.classPosts.id),
    )
    .where(
      and(
        eq(schema.classChallenges.userId, userId),
        eq(schema.classChallenges.status, "approved"),
        eq(schema.classPosts.level, "intermediate"),
      ),
    );

  const [totalAdvancedCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.classPosts)
    .where(
      and(
        eq(schema.classPosts.level, "advanced"),
        eq(schema.classPosts.visibility, "public"),
      ),
    );

  const [approvedAdvancedCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.classChallenges)
    .innerJoin(
      schema.classPosts,
      eq(schema.classChallenges.classPostId, schema.classPosts.id),
    )
    .where(
      and(
        eq(schema.classChallenges.userId, userId),
        eq(schema.classChallenges.status, "approved"),
        eq(schema.classPosts.level, "advanced"),
      ),
    );

  const publicPosts = publicPostCount?.count ?? 0;
  const totalLikes = totalLikesRow?.total ?? 0;
  const totalBeginner = totalBeginnerCount?.count ?? 0;
  const approvedBeginner = approvedBeginnerCount?.count ?? 0;
  const beginnerClearRate = totalBeginner > 0 ? (approvedBeginner / totalBeginner) * 100 : 0;
  const totalIntermediate = totalIntermediateCount?.count ?? 0;
  const approvedIntermediate = approvedIntermediateCount?.count ?? 0;
  const intermediateClearRate = totalIntermediate > 0 ? (approvedIntermediate / totalIntermediate) * 100 : 0;
  const totalAdvanced = totalAdvancedCount?.count ?? 0;
  const approvedAdvanced = approvedAdvancedCount?.count ?? 0;
  const advancedClearRate = totalAdvanced > 0 ? (approvedAdvanced / totalAdvanced) * 100 : 0;

  // --- 등급 자동 승급 ---
  // 현재 등급부터 시작해 모든 조건이 충족되면 다음 등급으로 올라간다.
  let currentTier = profile.tier ?? "bronze";
  for (let depth = 0; depth < TIER_ORDER.length; depth++) {
    const conditions = await getTierConditionsByTier(currentTier);
    if (conditions.length === 0) break;

    const stars = countStars(conditions, publicPosts, totalLikes, beginnerClearRate, intermediateClearRate, advancedClearRate);
    const allMet = stars >= conditions.length;
    const next = nextTier(currentTier);

    if (allMet && next) {
      // 다음 등급으로 승급 후 계속 확인
      currentTier = next;
    } else {
      // 이 등급에서 멈춤: tier + stars 저장 (자동 계산이므로 수동 오버라이드 해제)
      await db
        .update(schema.memberProfiles)
        .set({ tier: currentTier, stars, tierManualOverride: false, updatedAt: new Date() })
        .where(eq(schema.memberProfiles.id, profileId));
      return stars;
    }
  }

  // 레전드에서도 모든 조건 충족 시 — 레전드 5성으로 저장
  const legendConditions = await getTierConditionsByTier("legend");
  const legendStars = countStars(legendConditions, publicPosts, totalLikes, beginnerClearRate, intermediateClearRate, advancedClearRate);
  await db
    .update(schema.memberProfiles)
    .set({ tier: "legend", stars: legendStars, tierManualOverride: false, updatedAt: new Date() })
    .where(eq(schema.memberProfiles.id, profileId));
  return legendStars;
}

/** 전체 리거 별 일괄 재계산 — 수동 조정(tierManualOverride=true)된 리거는 제외 */
export async function recalculateAllRiggerStars(): Promise<number> {
  const riggers = await db
    .select({ id: schema.memberProfiles.id, userId: schema.memberProfiles.userId })
    .from(schema.memberProfiles)
    .where(
      and(
        eq(schema.memberProfiles.memberType, "rigger"),
        eq(schema.memberProfiles.status, "approved"),
        eq(schema.memberProfiles.tierManualOverride, false),
      ),
    );

  for (const r of riggers) {
    await recalculateRiggerStars(r.id, r.userId);
  }
  return riggers.length;
}

/** 수동 조정 취소 후 해당 리거만 재계산 */
export async function cancelManualOverrideAndRecalculate(
  profileId: string,
  userId: string,
): Promise<{ tier: string; stars: number }> {
  const stars = await recalculateRiggerStars(profileId, userId);
  const [updated] = await db
    .select({ tier: schema.memberProfiles.tier, stars: schema.memberProfiles.stars })
    .from(schema.memberProfiles)
    .where(eq(schema.memberProfiles.id, profileId))
    .limit(1);
  return { tier: updated?.tier ?? "bronze", stars: updated?.stars ?? stars };
}

/** 관리자용: 리거 목록 + 현재 tier/stars 반환 */
export type RiggerTierRow = {
  profileId: string;
  userId: string;
  nickname: string;
  tier: string;
  stars: number;
  /** 관리자가 수동으로 등급/별을 변경한 경우 true */
  tierManualOverride: boolean;
};

export async function getRiggerTierList(): Promise<RiggerTierRow[]> {
  const rows = await db
    .select({
      profileId: schema.memberProfiles.id,
      userId: schema.memberProfiles.userId,
      nickname: schema.memberProfiles.nickname,
      tier: schema.memberProfiles.tier,
      stars: schema.memberProfiles.stars,
      tierManualOverride: schema.memberProfiles.tierManualOverride,
    })
    .from(schema.memberProfiles)
    .where(
      and(
        eq(schema.memberProfiles.memberType, "rigger"),
        eq(schema.memberProfiles.status, "approved"),
      ),
    )
    .orderBy(asc(schema.memberProfiles.nickname));
  return rows.map((r) => ({
    ...r,
    tier: r.tier ?? "bronze",
    stars: r.stars ?? 0,
    tierManualOverride: r.tierManualOverride ?? false,
  }));
}

/** 관리자 수동으로 특정 리거 tier/stars 변경 */
export async function updateRiggerTierAndStars(
  profileId: string,
  tier: string,
  stars: number,
): Promise<void> {
  await db
    .update(schema.memberProfiles)
    .set({ tier, stars, tierManualOverride: true, updatedAt: new Date() })
    .where(eq(schema.memberProfiles.id, profileId));
}
