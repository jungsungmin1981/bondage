import { and, eq } from "drizzle-orm";
import { db } from "../client/node";
import * as schema from "../schema";

export type MemberProfileRow = {
  id: string;
  userId: string;
  memberType: string;
  nickname: string;
  iconUrl: string | null;
  bio: string | null;
  cardImageUrl: string | null;
  gender: string | null;
  division: string | null;
  bunnyRecruit: string | null;
  bondageRating: string | null;
  activityRegion: string | null;
  style: string | null;
  status: string;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type MemberProfileUpdate = {
  nickname?: string;
  iconUrl?: string | null;
  bio?: string | null;
  cardImageUrl?: string | null;
  gender?: string | null;
  division?: string | null;
  bunnyRecruit?: string | null;
  bondageRating?: string | null;
  activityRegion?: string | null;
  style?: string | null;
};

export type MemberProfileCreate = {
  nickname: string;
  iconUrl?: string | null;
  bio?: string | null;
  gender?: string | null;
  division?: string | null;
  bunnyRecruit?: string | null;
  bondageRating?: string | null;
  activityRegion?: string | null;
  style?: string | null;
};

/**
 * 한 유저의 member_profiles 1건 조회. 없으면 null.
 */
export async function getMemberProfileByUserId(
  userId: string,
): Promise<MemberProfileRow | null> {
  const rows = await db
    .select()
    .from(schema.memberProfiles)
    .where(eq(schema.memberProfiles.userId, userId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    userId: row.userId,
    memberType: row.memberType,
    nickname: row.nickname,
    iconUrl: row.iconUrl,
    bio: row.bio,
    cardImageUrl: row.cardImageUrl ?? null,
    gender: row.gender ?? null,
    division: row.division ?? null,
    bunnyRecruit: row.bunnyRecruit ?? null,
    bondageRating: row.bondageRating ?? null,
    activityRegion: row.activityRegion ?? null,
    style: row.style ?? null,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** member_profiles.id(프로필 id)로 userId 조회. 없으면 null */
export async function getUserIdByMemberProfileId(
  profileId: string,
): Promise<string | null> {
  const rows = await db
    .select({ userId: schema.memberProfiles.userId })
    .from(schema.memberProfiles)
    .where(eq(schema.memberProfiles.id, profileId))
    .limit(1);
  return rows[0]?.userId ?? null;
}

/**
 * 본인 프로필 상세 수정 (userId 일치 시에만).
 */
export async function updateMemberProfile(
  userId: string,
  data: MemberProfileUpdate,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (data.nickname !== undefined) {
    const v = data.nickname.trim().slice(0, 200);
    if (!v) return { ok: false, error: "닉네임을 입력해 주세요." };
    set.nickname = v;
  }
  if (data.iconUrl !== undefined) set.iconUrl = data.iconUrl?.trim() ?? null;
  if (data.bio !== undefined) set.bio = data.bio?.trim() ?? null;
  if (data.cardImageUrl !== undefined) set.cardImageUrl = data.cardImageUrl?.trim() ?? null;
  if (data.gender !== undefined) set.gender = data.gender?.trim() ?? null;
  if (data.division !== undefined) set.division = data.division?.trim() ?? null;
  if (data.bunnyRecruit !== undefined)
    set.bunnyRecruit = data.bunnyRecruit?.trim() ?? null;
  if (data.bondageRating !== undefined)
    set.bondageRating = data.bondageRating?.trim() ?? null;
  if (data.activityRegion !== undefined)
    set.activityRegion = data.activityRegion?.trim().slice(0, 50) ?? null;
  if (data.style !== undefined) set.style = data.style?.trim() ?? null;

  await db
    .update(schema.memberProfiles)
    .set(set as Record<string, unknown>)
    .where(eq(schema.memberProfiles.userId, userId));
  return { ok: true };
}

/**
 * 버니 프로필 생성. status = 'approved' 로 저장 (승인 절차 없음). 상세 필드 포함.
 */
export async function createBunnyProfile(
  userId: string,
  data: MemberProfileCreate,
): Promise<{ ok: true; profileId: string } | { ok: false; error: string }> {
  const existing = await getMemberProfileByUserId(userId);
  if (existing) {
    return { ok: false, error: "이미 프로필이 있습니다." };
  }
  const id = crypto.randomUUID();
  await db.insert(schema.memberProfiles).values({
    id,
    userId,
    memberType: "bunny",
    nickname: data.nickname.trim().slice(0, 200),
    iconUrl: data.iconUrl?.trim() ?? null,
    bio: data.bio?.trim() ?? null,
    cardImageUrl: "/default-bunny-card.png",
    gender: data.gender?.trim() ?? null,
    division: data.division?.trim() ?? null,
    bunnyRecruit: data.bunnyRecruit?.trim() ?? null,
    bondageRating: data.bondageRating?.trim() ?? null,
    activityRegion: data.activityRegion?.trim().slice(0, 50) ?? null,
    style: data.style?.trim() ?? null,
    status: "approved",
    updatedAt: new Date(),
  });
  return { ok: true, profileId: id };
}

/**
 * 리거 프로필 생성. status = 'pending' 로 저장 (관리자 승인 대기). 상세 필드 포함.
 */
export async function createRiggerProfile(
  userId: string,
  data: MemberProfileCreate,
): Promise<{ ok: true; profileId: string } | { ok: false; error: string }> {
  const existing = await getMemberProfileByUserId(userId);
  if (existing) {
    return { ok: false, error: "이미 프로필이 있습니다." };
  }
  const id = crypto.randomUUID();
  await db.insert(schema.memberProfiles).values({
    id,
    userId,
    memberType: "rigger",
    nickname: data.nickname.trim().slice(0, 200),
    iconUrl: data.iconUrl?.trim() ?? null,
    bio: data.bio?.trim() ?? null,
    gender: data.gender?.trim() ?? null,
    division: data.division?.trim() ?? null,
    bunnyRecruit: data.bunnyRecruit?.trim() ?? null,
    bondageRating: data.bondageRating?.trim() ?? null,
    activityRegion: data.activityRegion?.trim().slice(0, 50) ?? null,
    style: data.style?.trim() ?? null,
    status: "pending",
    updatedAt: new Date(),
  });
  return { ok: true, profileId: id };
}

export type PendingRiggerProfileRow = MemberProfileRow & {
  email: string | null;
  userName: string | null;
};

/**
 * 관리자용: status = 'pending' 인 리거 프로필 목록 (users join).
 */
export async function getPendingRiggerProfiles(): Promise<
  PendingRiggerProfileRow[]
> {
  const rows = await db
    .select({
      id: schema.memberProfiles.id,
      userId: schema.memberProfiles.userId,
      memberType: schema.memberProfiles.memberType,
      nickname: schema.memberProfiles.nickname,
      iconUrl: schema.memberProfiles.iconUrl,
      bio: schema.memberProfiles.bio,
      cardImageUrl: schema.memberProfiles.cardImageUrl,
      gender: schema.memberProfiles.gender,
      division: schema.memberProfiles.division,
      bunnyRecruit: schema.memberProfiles.bunnyRecruit,
      bondageRating: schema.memberProfiles.bondageRating,
      activityRegion: schema.memberProfiles.activityRegion,
      style: schema.memberProfiles.style,
      status: schema.memberProfiles.status,
      createdAt: schema.memberProfiles.createdAt,
      updatedAt: schema.memberProfiles.updatedAt,
      email: schema.users.email,
      userName: schema.users.name,
    })
    .from(schema.memberProfiles)
    .innerJoin(schema.users, eq(schema.memberProfiles.userId, schema.users.id))
    .where(
    and(
      eq(schema.memberProfiles.memberType, "rigger"),
      eq(schema.memberProfiles.status, "pending"),
    ),
  );
  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    memberType: r.memberType,
    nickname: r.nickname,
    iconUrl: r.iconUrl,
    bio: r.bio,
    cardImageUrl: r.cardImageUrl ?? null,
    gender: r.gender ?? null,
    division: r.division ?? null,
    bunnyRecruit: r.bunnyRecruit ?? null,
    bondageRating: r.bondageRating ?? null,
    activityRegion: r.activityRegion ?? null,
    style: r.style ?? null,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    email: r.email ?? null,
    userName: r.userName ?? null,
  }));
}

/**
 * 리거 프로필 승인 (관리자 전용). id는 member_profiles.id.
 */
export async function approveRiggerProfile(
  profileId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const rows = await db
    .select({ id: schema.memberProfiles.id })
    .from(schema.memberProfiles)
    .where(
    and(
      eq(schema.memberProfiles.id, profileId),
      eq(schema.memberProfiles.memberType, "rigger"),
    ),
  )
    .limit(1);
  if (!rows[0]) {
    return { ok: false, error: "해당 리거 프로필을 찾을 수 없습니다." };
  }
  await db
    .update(schema.memberProfiles)
    .set({ status: "approved", updatedAt: new Date() })
    .where(eq(schema.memberProfiles.id, profileId));
  return { ok: true };
}

export type ApprovedBunnyWithUser = MemberProfileRow & {
  email: string | null;
  userName: string | null;
};

export type RiggerProfileWithUser = MemberProfileRow & {
  email: string | null;
  userName: string | null;
};

/**
 * 리거 프로필 1건 ID로 조회 (memberType = 'rigger' 인 경우만). 상세/프로필편집용.
 */
export async function getRiggerProfileById(
  id: string,
): Promise<RiggerProfileWithUser | null> {
  const rows = await db
    .select({
      id: schema.memberProfiles.id,
      userId: schema.memberProfiles.userId,
      memberType: schema.memberProfiles.memberType,
      nickname: schema.memberProfiles.nickname,
      iconUrl: schema.memberProfiles.iconUrl,
      bio: schema.memberProfiles.bio,
      cardImageUrl: schema.memberProfiles.cardImageUrl,
      gender: schema.memberProfiles.gender,
      division: schema.memberProfiles.division,
      bunnyRecruit: schema.memberProfiles.bunnyRecruit,
      bondageRating: schema.memberProfiles.bondageRating,
      activityRegion: schema.memberProfiles.activityRegion,
      style: schema.memberProfiles.style,
      status: schema.memberProfiles.status,
      createdAt: schema.memberProfiles.createdAt,
      updatedAt: schema.memberProfiles.updatedAt,
      email: schema.users.email,
      userName: schema.users.name,
    })
    .from(schema.memberProfiles)
    .innerJoin(schema.users, eq(schema.memberProfiles.userId, schema.users.id))
    .where(
      and(
        eq(schema.memberProfiles.id, id),
        eq(schema.memberProfiles.memberType, "rigger"),
      ),
    )
    .limit(1);
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    userId: r.userId,
    memberType: r.memberType,
    nickname: r.nickname,
    iconUrl: r.iconUrl,
    bio: r.bio,
    cardImageUrl: r.cardImageUrl ?? null,
    gender: r.gender ?? null,
    division: r.division ?? null,
    bunnyRecruit: r.bunnyRecruit ?? null,
    bondageRating: r.bondageRating ?? null,
    activityRegion: r.activityRegion ?? null,
    style: r.style ?? null,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    email: r.email ?? null,
    userName: r.userName ?? null,
  };
}

/**
 * 특정 사용자의 리거 프로필 1건 조회 (승인 여부 무관). 목록에서 본인 카드 표시용.
 */
export async function getRiggerProfileByUserId(
  userId: string,
): Promise<RiggerProfileWithUser | null> {
  const rows = await db
    .select({
      id: schema.memberProfiles.id,
      userId: schema.memberProfiles.userId,
      memberType: schema.memberProfiles.memberType,
      nickname: schema.memberProfiles.nickname,
      iconUrl: schema.memberProfiles.iconUrl,
      bio: schema.memberProfiles.bio,
      cardImageUrl: schema.memberProfiles.cardImageUrl,
      gender: schema.memberProfiles.gender,
      division: schema.memberProfiles.division,
      bunnyRecruit: schema.memberProfiles.bunnyRecruit,
      bondageRating: schema.memberProfiles.bondageRating,
      activityRegion: schema.memberProfiles.activityRegion,
      style: schema.memberProfiles.style,
      status: schema.memberProfiles.status,
      createdAt: schema.memberProfiles.createdAt,
      updatedAt: schema.memberProfiles.updatedAt,
      email: schema.users.email,
      userName: schema.users.name,
    })
    .from(schema.memberProfiles)
    .innerJoin(schema.users, eq(schema.memberProfiles.userId, schema.users.id))
    .where(
      and(
        eq(schema.memberProfiles.userId, userId),
        eq(schema.memberProfiles.memberType, "rigger"),
      ),
    )
    .limit(1);
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    userId: r.userId,
    memberType: r.memberType,
    nickname: r.nickname,
    iconUrl: r.iconUrl,
    bio: r.bio,
    cardImageUrl: r.cardImageUrl ?? null,
    gender: r.gender ?? null,
    division: r.division ?? null,
    bunnyRecruit: r.bunnyRecruit ?? null,
    bondageRating: r.bondageRating ?? null,
    activityRegion: r.activityRegion ?? null,
    style: r.style ?? null,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    email: r.email ?? null,
    userName: r.userName ?? null,
  };
}

/**
 * 승인된 리거 목록: memberType = 'rigger', status = 'approved' + users join.
 */
export async function getApprovedRiggerProfiles(): Promise<
  RiggerProfileWithUser[]
> {
  const rows = await db
    .select({
      id: schema.memberProfiles.id,
      userId: schema.memberProfiles.userId,
      memberType: schema.memberProfiles.memberType,
      nickname: schema.memberProfiles.nickname,
      iconUrl: schema.memberProfiles.iconUrl,
      bio: schema.memberProfiles.bio,
      cardImageUrl: schema.memberProfiles.cardImageUrl,
      gender: schema.memberProfiles.gender,
      division: schema.memberProfiles.division,
      bunnyRecruit: schema.memberProfiles.bunnyRecruit,
      bondageRating: schema.memberProfiles.bondageRating,
      activityRegion: schema.memberProfiles.activityRegion,
      style: schema.memberProfiles.style,
      status: schema.memberProfiles.status,
      createdAt: schema.memberProfiles.createdAt,
      updatedAt: schema.memberProfiles.updatedAt,
      email: schema.users.email,
      userName: schema.users.name,
    })
    .from(schema.memberProfiles)
    .innerJoin(schema.users, eq(schema.memberProfiles.userId, schema.users.id))
    .where(
      and(
        eq(schema.memberProfiles.memberType, "rigger"),
        eq(schema.memberProfiles.status, "approved"),
      ),
    );
  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    memberType: r.memberType,
    nickname: r.nickname,
    iconUrl: r.iconUrl,
    bio: r.bio,
    cardImageUrl: r.cardImageUrl ?? null,
    gender: r.gender ?? null,
    division: r.division ?? null,
    bunnyRecruit: r.bunnyRecruit ?? null,
    bondageRating: r.bondageRating ?? null,
    activityRegion: r.activityRegion ?? null,
    style: r.style ?? null,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    email: r.email ?? null,
    userName: r.userName ?? null,
  }));
}

/**
 * 버니 프로필 1건 ID로 조회 (memberType = 'bunny' 인 경우만). 상세 페이지용.
 */
export async function getBunnyProfileById(
  id: string,
): Promise<ApprovedBunnyWithUser | null> {
  const rows = await db
    .select({
      id: schema.memberProfiles.id,
      userId: schema.memberProfiles.userId,
      memberType: schema.memberProfiles.memberType,
      nickname: schema.memberProfiles.nickname,
      iconUrl: schema.memberProfiles.iconUrl,
      bio: schema.memberProfiles.bio,
      cardImageUrl: schema.memberProfiles.cardImageUrl,
      gender: schema.memberProfiles.gender,
      division: schema.memberProfiles.division,
      bunnyRecruit: schema.memberProfiles.bunnyRecruit,
      bondageRating: schema.memberProfiles.bondageRating,
      activityRegion: schema.memberProfiles.activityRegion,
      style: schema.memberProfiles.style,
      status: schema.memberProfiles.status,
      createdAt: schema.memberProfiles.createdAt,
      updatedAt: schema.memberProfiles.updatedAt,
      email: schema.users.email,
      userName: schema.users.name,
    })
    .from(schema.memberProfiles)
    .innerJoin(schema.users, eq(schema.memberProfiles.userId, schema.users.id))
    .where(
      and(
        eq(schema.memberProfiles.id, id),
        eq(schema.memberProfiles.memberType, "bunny"),
      ),
    )
    .limit(1);
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    userId: r.userId,
    memberType: r.memberType,
    nickname: r.nickname,
    iconUrl: r.iconUrl,
    bio: r.bio,
    cardImageUrl: r.cardImageUrl ?? null,
    gender: r.gender ?? null,
    division: r.division ?? null,
    bunnyRecruit: r.bunnyRecruit ?? null,
    bondageRating: r.bondageRating ?? null,
    activityRegion: r.activityRegion ?? null,
    style: r.style ?? null,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    email: r.email ?? null,
    userName: r.userName ?? null,
  };
}

/**
 * 버니 목록: memberType = 'bunny' 이고 status = 'approved' 인 프로필 + users join.
 */
export async function getApprovedBunnyProfiles(): Promise<
  ApprovedBunnyWithUser[]
> {
  const rows = await db
    .select({
      id: schema.memberProfiles.id,
      userId: schema.memberProfiles.userId,
      memberType: schema.memberProfiles.memberType,
      nickname: schema.memberProfiles.nickname,
      iconUrl: schema.memberProfiles.iconUrl,
      bio: schema.memberProfiles.bio,
      cardImageUrl: schema.memberProfiles.cardImageUrl,
      gender: schema.memberProfiles.gender,
      division: schema.memberProfiles.division,
      bunnyRecruit: schema.memberProfiles.bunnyRecruit,
      bondageRating: schema.memberProfiles.bondageRating,
      activityRegion: schema.memberProfiles.activityRegion,
      style: schema.memberProfiles.style,
      status: schema.memberProfiles.status,
      createdAt: schema.memberProfiles.createdAt,
      updatedAt: schema.memberProfiles.updatedAt,
      email: schema.users.email,
      userName: schema.users.name,
    })
    .from(schema.memberProfiles)
    .innerJoin(schema.users, eq(schema.memberProfiles.userId, schema.users.id))
    .where(
    and(
      eq(schema.memberProfiles.memberType, "bunny"),
      eq(schema.memberProfiles.status, "approved"),
    ),
  );
  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    memberType: r.memberType,
    nickname: r.nickname,
    iconUrl: r.iconUrl,
    bio: r.bio,
    cardImageUrl: r.cardImageUrl ?? null,
    gender: r.gender ?? null,
    division: r.division ?? null,
    bunnyRecruit: r.bunnyRecruit ?? null,
    bondageRating: r.bondageRating ?? null,
    activityRegion: r.activityRegion ?? null,
    style: r.style ?? null,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    email: r.email ?? null,
    userName: r.userName ?? null,
  }));
}
