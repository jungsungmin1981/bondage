import type { SQL } from "drizzle-orm";
import { and, asc, desc, eq, ilike, inArray, isNotNull, isNull, ne, not, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../client/node";
import * as schema from "../schema";

const referrerProfile = alias(schema.memberProfiles, "referrer_profile");

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
  markImageUrl: string | null;
  profileVisibility: string | null;
  status: string;
  rejectionNote?: string | null;
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
  markImageUrl?: string | null;
  profileVisibility?: string | null;
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
    markImageUrl: row.markImageUrl ?? null,
    profileVisibility: row.profileVisibility ?? null,
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
 * 닉네임이 이미 다른 회원 프로필에서 사용 중인지 조회.
 * 대소문자·앞뒤 공백 무시. excludeUserId 지정 시 해당 유저 프로필은 제외 (수정 시 본인 닉네임 허용).
 */
export async function isNicknameTaken(
  nickname: string,
  excludeUserId?: string,
): Promise<boolean> {
  const trimmed = nickname.trim().slice(0, 200);
  if (!trimmed) return false;
  const conditions = [
    sql`lower(trim(${schema.memberProfiles.nickname})) = lower(${trimmed})`,
  ];
  if (excludeUserId) {
    conditions.push(ne(schema.memberProfiles.userId, excludeUserId));
  }
  const rows = await db
    .select({ id: schema.memberProfiles.id })
    .from(schema.memberProfiles)
    .where(and(...conditions))
    .limit(1);
  return rows.length > 0;
}

/** 닉네임으로 회원 검색 (관리자 이용제한용). 최대 50건. */
export async function searchMemberProfilesByNickname(
  query: string,
): Promise<{ id: string; userId: string; nickname: string; memberType: string }[]> {
  const trimmed = query.trim().slice(0, 100);
  if (!trimmed) return [];
  const rows = await db
    .select({
      id: schema.memberProfiles.id,
      userId: schema.memberProfiles.userId,
      nickname: schema.memberProfiles.nickname,
      memberType: schema.memberProfiles.memberType,
    })
    .from(schema.memberProfiles)
    .where(ilike(schema.memberProfiles.nickname, `%${trimmed}%`))
    .limit(50);
  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    nickname: r.nickname,
    memberType: r.memberType,
  }));
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
    if (await isNicknameTaken(v, userId)) {
      return { ok: false, error: "이미 사용 중인 닉네임입니다." };
    }
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
  if (data.markImageUrl !== undefined) set.markImageUrl = data.markImageUrl?.trim() ?? null;
  if (data.profileVisibility !== undefined) set.profileVisibility = data.profileVisibility ?? null;

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
  if (await isNicknameTaken(data.nickname)) {
    return { ok: false, error: "이미 사용 중인 닉네임입니다." };
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
  if (await isNicknameTaken(data.nickname)) {
    return { ok: false, error: "이미 사용 중인 닉네임입니다." };
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

/**
 * 운영진 프로필 생성. status = 'pending' 로 저장 (관리자 승인 대기).
 * 닉네임·자기소개만 필수, 나머지는 null.
 */
export async function createOperatorProfile(
  userId: string,
  data: { nickname: string; bio?: string | null; iconUrl?: string | null },
): Promise<{ ok: true; profileId: string } | { ok: false; error: string }> {
  const existing = await getMemberProfileByUserId(userId);
  if (existing) {
    return { ok: false, error: "이미 프로필이 있습니다." };
  }
  const nickname = data.nickname?.trim();
  if (!nickname) {
    return { ok: false, error: "닉네임을 입력해 주세요." };
  }
  if (await isNicknameTaken(nickname)) {
    return { ok: false, error: "이미 사용 중인 닉네임입니다." };
  }
  const id = crypto.randomUUID();
  await db.insert(schema.memberProfiles).values({
    id,
    userId,
    memberType: "operator",
    nickname: nickname.slice(0, 200),
    iconUrl: data.iconUrl?.trim() ?? null,
    bio: data.bio?.trim() ?? null,
    gender: null,
    division: null,
    bunnyRecruit: null,
    bondageRating: null,
    activityRegion: null,
    style: null,
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
      markImageUrl: schema.memberProfiles.markImageUrl,
      profileVisibility: schema.memberProfiles.profileVisibility,
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
        isNull(schema.memberProfiles.reRequestedAt),
      ),
    )
    .orderBy(asc(schema.memberProfiles.createdAt));
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
    markImageUrl: r.markImageUrl ?? null,
    profileVisibility: r.profileVisibility ?? null,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    email: r.email ?? null,
    userName: r.userName ?? null,
  }));
}

export type ReRequestedRiggerProfileRow = PendingRiggerProfileRow & {
  reRequestedAt: Date | null;
};

/**
 * 관리자용: status = 'pending' 이고 re_requested_at 이 있는 리거 (재승인 요청). 최근 재요청일 순.
 */
export async function getReRequestedRiggerProfiles(): Promise<
  ReRequestedRiggerProfileRow[]
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
      markImageUrl: schema.memberProfiles.markImageUrl,
      profileVisibility: schema.memberProfiles.profileVisibility,
      status: schema.memberProfiles.status,
      reRequestedAt: schema.memberProfiles.reRequestedAt,
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
        // re_requested_at IS NOT NULL
        isNotNull(schema.memberProfiles.reRequestedAt),
      ),
    )
    .orderBy(desc(schema.memberProfiles.reRequestedAt));
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
    markImageUrl: r.markImageUrl ?? null,
    profileVisibility: r.profileVisibility ?? null,
    status: r.status,
    reRequestedAt: r.reRequestedAt ?? null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    email: r.email ?? null,
    userName: r.userName ?? null,
  }));
}

/**
 * 관리자용: status = 'rejected' 인 리거 프로필 목록 (users join). 최근 반려일 순.
 */
export async function getRejectedRiggerProfiles(): Promise<
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
      markImageUrl: schema.memberProfiles.markImageUrl,
      profileVisibility: schema.memberProfiles.profileVisibility,
      status: schema.memberProfiles.status,
      rejectionNote: schema.memberProfiles.rejectionNote,
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
        eq(schema.memberProfiles.status, "rejected"),
      ),
    )
    .orderBy(desc(schema.memberProfiles.updatedAt));
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
    markImageUrl: r.markImageUrl ?? null,
    profileVisibility: r.profileVisibility ?? null,
    status: r.status,
    rejectionNote: r.rejectionNote ?? null,
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

export type PendingOperatorProfileRow = {
  id: string;
  userId: string;
  nickname: string;
  iconUrl: string | null;
  bio: string | null;
  createdAt: Date | null;
  email: string | null;
  userName: string | null;
  username: string | null;
  /** 인증키 발급자(추천인) 닉네임. 관리자 발급 키면 null */
  referrerNickname: string | null;
};

/** 관리자용 운영진 목록용. status 포함 (pending | approved | rejected). */
export type OperatorProfileRowForAdmin = PendingOperatorProfileRow & {
  status: string;
};

/**
 * 관리자용: 운영진 프로필 전체 목록 (users join). 최신순. 승인 여부 관계없이 모두 표시.
 * 추천인(인증키 발급자) 닉네임 포함. 관리자 발급 키(rigger_id null)면 null.
 * member_profiles 없이 users.memberType='operator'인 경우도 포함.
 */
export async function getOperatorProfilesForAdmin(): Promise<
  OperatorProfileRowForAdmin[]
> {
  // member_profiles가 있는 operator
  const withProfile = await db
    .select({
      id: schema.memberProfiles.id,
      userId: schema.memberProfiles.userId,
      nickname: schema.memberProfiles.nickname,
      iconUrl: schema.memberProfiles.iconUrl,
      bio: schema.memberProfiles.bio,
      createdAt: schema.memberProfiles.createdAt,
      status: schema.memberProfiles.status,
      email: schema.users.email,
      userName: schema.users.name,
      username: schema.users.username,
      referrerNickname: referrerProfile.nickname,
    })
    .from(schema.memberProfiles)
    .innerJoin(schema.users, eq(schema.memberProfiles.userId, schema.users.id))
    .leftJoin(schema.inviteKeys, eq(schema.users.inviteKeyId, schema.inviteKeys.id))
    .leftJoin(
      referrerProfile,
      eq(referrerProfile.userId, schema.inviteKeys.riggerId),
    )
    .where(eq(schema.memberProfiles.memberType, "operator"))
    .orderBy(desc(schema.memberProfiles.createdAt));

  const profileUserIds = new Set(withProfile.map((r) => r.userId).filter(Boolean));

  // member_profiles 없이 users.memberType='operator'인 경우 (이전 버그로 프로필 미생성된 케이스)
  const withoutProfileRows = await db
    .select({
      id: schema.users.id,
      userId: schema.users.id,
      nickname: schema.users.username,
      email: schema.users.email,
      userName: schema.users.name,
      username: schema.users.username,
      createdAt: schema.users.createdAt,
    })
    .from(schema.users)
    .where(eq(schema.users.memberType, "operator"));

  const noProfileRows = withoutProfileRows
    .filter((r) => !profileUserIds.has(r.userId))
    .map((r) => ({
      id: `no-profile-${r.userId}`,
      userId: r.userId,
      nickname: r.nickname ?? r.email ?? "운영진",
      iconUrl: null as string | null,
      bio: null as string | null,
      createdAt: r.createdAt,
      status: "pending",
      email: r.email ?? null,
      userName: r.userName ?? null,
      username: r.username ?? null,
      referrerNickname: null as string | null,
    }));

  const combined = [
    ...withProfile.map((r) => ({
      id: r.id,
      userId: r.userId,
      nickname: r.nickname,
      iconUrl: r.iconUrl ?? null,
      bio: r.bio ?? null,
      createdAt: r.createdAt,
      status: r.status,
      email: r.email ?? null,
      userName: r.userName ?? null,
      username: r.username ?? null,
      referrerNickname: r.referrerNickname ?? null,
    })),
    ...noProfileRows,
  ];

  combined.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return combined;
}

/**
 * 운영진 프로필 승인 (관리자 전용). id는 member_profiles.id.
 * 승인 시 해당 운영진의 모든 세션을 삭제하여 자동 로그아웃시킨다.
 */
export async function approveOperatorProfile(
  profileId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const rows = await db
    .select({
      id: schema.memberProfiles.id,
      userId: schema.memberProfiles.userId,
    })
    .from(schema.memberProfiles)
    .where(
      and(
        eq(schema.memberProfiles.id, profileId),
        eq(schema.memberProfiles.memberType, "operator"),
      ),
    )
    .limit(1);
  if (!rows[0]) {
    return { ok: false, error: "해당 운영진 프로필을 찾을 수 없습니다." };
  }
  const { userId } = rows[0];
  await db
    .update(schema.memberProfiles)
    .set({ status: "approved", updatedAt: new Date() })
    .where(eq(schema.memberProfiles.id, profileId));
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
  return { ok: true };
}

/**
 * 운영진 프로필 승인 (userId 기준). member_profiles가 없으면 생성 후 바로 승인.
 * getOperatorProfilesForAdmin에서 'no-profile-{userId}' 케이스용.
 */
export async function approveOperatorProfileByUserId(
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [user] = await db
    .select({ id: schema.users.id, memberType: schema.users.memberType, username: schema.users.username, email: schema.users.email })
    .from(schema.users)
    .where(and(eq(schema.users.id, userId), eq(schema.users.memberType, "operator")))
    .limit(1);
  if (!user) {
    return { ok: false, error: "해당 운영진 사용자를 찾을 수 없습니다." };
  }

  const existingProfile = await getMemberProfileByUserId(userId);
  if (existingProfile) {
    if (existingProfile.memberType !== "operator") {
      return { ok: false, error: "운영진 프로필이 아닙니다." };
    }
    await db
      .update(schema.memberProfiles)
      .set({ status: "approved", updatedAt: new Date() })
      .where(eq(schema.memberProfiles.id, existingProfile.id));
  } else {
    const nickname = user.username ?? user.email ?? "운영진";
    const profileId = crypto.randomUUID();
    await db.insert(schema.memberProfiles).values({
      id: profileId,
      userId,
      memberType: "operator",
      nickname: nickname.slice(0, 200),
      status: "approved",
      updatedAt: new Date(),
    });
  }

  await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
  return { ok: true };
}

/**
 * 리거 프로필 반려 (관리자 전용). id는 member_profiles.id.
 * rejectionNote: 반려 시 보낸 쪽지 내용 (저장해 두었다가 목록에서 확인용).
 */
export async function rejectRiggerProfile(
  profileId: string,
  rejectionNote?: string | null,
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
    .set({
      status: "rejected",
      updatedAt: new Date(),
      ...(rejectionNote != null && { rejectionNote }),
    })
    .where(eq(schema.memberProfiles.id, profileId));
  return { ok: true };
}

/**
 * 리거 프로필 재승인 요청 (본인 전용). status가 'rejected'일 때만 'pending'으로 변경.
 */
export async function requestRiggerApprovalAgain(
  profileId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const rows = await db
    .select({ id: schema.memberProfiles.id, status: schema.memberProfiles.status })
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
  if (rows[0].status !== "rejected") {
    return { ok: false, error: "반려된 상태에서만 다시 승인을 요청할 수 있습니다." };
  }
  const now = new Date();
  await db
    .update(schema.memberProfiles)
    .set({ status: "pending", updatedAt: now, reRequestedAt: now })
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
      markImageUrl: schema.memberProfiles.markImageUrl,
      profileVisibility: schema.memberProfiles.profileVisibility,
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
    markImageUrl: r.markImageUrl ?? null,
    profileVisibility: r.profileVisibility ?? null,
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
      markImageUrl: schema.memberProfiles.markImageUrl,
      profileVisibility: schema.memberProfiles.profileVisibility,
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
    markImageUrl: r.markImageUrl ?? null,
    profileVisibility: r.profileVisibility ?? null,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    email: r.email ?? null,
    userName: r.userName ?? null,
  };
}

export type GetApprovedRiggerProfilesOptions = {
  /** 이메일 목록에 해당하는 사용자 제외 (주 관리자 등) */
  excludeEmails?: string[];
  /** 아이디(username) 목록에 해당하는 사용자 제외 */
  excludeUsernames?: string[];
};

/**
 * 승인된 리거 목록: memberType = 'rigger', status = 'approved' + users join.
 * options.excludeEmails / excludeUsernames 에 해당하는 사용자는 목록에서 제외.
 */
export async function getApprovedRiggerProfiles(
  options?: GetApprovedRiggerProfilesOptions,
): Promise<RiggerProfileWithUser[]> {
  const excludeEmails = (options?.excludeEmails ?? []).filter(
    (e): e is string => typeof e === "string" && e.trim().length > 0,
  );
  const excludeUsernames = (options?.excludeUsernames ?? []).filter(
    (u): u is string => typeof u === "string" && u.trim().length > 0,
  );

  const conditions = [
    eq(schema.memberProfiles.memberType, "rigger"),
    eq(schema.memberProfiles.status, "approved"),
  ];
  if (excludeEmails.length > 0 || excludeUsernames.length > 0) {
    const parts: SQL[] = [];
    if (excludeEmails.length > 0) parts.push(inArray(schema.users.email, excludeEmails));
    if (excludeUsernames.length > 0) parts.push(inArray(schema.users.username, excludeUsernames));
    if (parts.length === 2) {
      const a = parts[0]!;
      const b = parts[1]!;
      // drizzle or() types expect SQLWrapper; inArray() returns SQL<unknown>
      // @ts-expect-error - runtime types are correct
      conditions.push(not(or(a, b)));
    } else if (parts.length === 1) {
      conditions.push(not(parts[0]!));
    }
  }

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
      markImageUrl: schema.memberProfiles.markImageUrl,
      profileVisibility: schema.memberProfiles.profileVisibility,
      status: schema.memberProfiles.status,
      createdAt: schema.memberProfiles.createdAt,
      updatedAt: schema.memberProfiles.updatedAt,
      email: schema.users.email,
      userName: schema.users.name,
    })
    .from(schema.memberProfiles)
    .innerJoin(schema.users, eq(schema.memberProfiles.userId, schema.users.id))
    .where(and(...conditions));
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
    markImageUrl: r.markImageUrl ?? null,
    profileVisibility: r.profileVisibility ?? null,
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
      markImageUrl: schema.memberProfiles.markImageUrl,
      profileVisibility: schema.memberProfiles.profileVisibility,
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
    markImageUrl: r.markImageUrl ?? null,
    profileVisibility: r.profileVisibility ?? null,
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
      markImageUrl: schema.memberProfiles.markImageUrl,
      profileVisibility: schema.memberProfiles.profileVisibility,
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
    markImageUrl: r.markImageUrl ?? null,
    profileVisibility: r.profileVisibility ?? null,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    email: r.email ?? null,
    userName: r.userName ?? null,
  }));
}
