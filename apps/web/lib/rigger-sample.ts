export type RiggerTier = "legend" | "gold" | "silver" | "bronze";

export type Rigger = {
  id: string;
  name: string;
  tier: RiggerTier;
  avatarFallback: string;
  avatarUrl?: string | null;
  /** 원형 마크 영역에 표시할 이미지 URL (미설정 시 아바타 표시) */
  markImageUrl?: string | null;
  /** 브론즈·실버·골드: 1~5 (골드 2명씩, 실버 3명씩, 브론즈 4명씩 5→4→3→2→1) */
  stars?: number;
  gender?: string | null;
  /** 구분: 리거 / 버니 / 리거 & 버니 */
  division?: string | null;
  bunnyRecruit?: string | null;
  bondageRating?: string | null;
  style?: string | null;
  bio?: string | null;
};

const LEGEND_NAMES = ["치우천왕", "이마스터", "박치우"];
const GOLD_NAMES = [
  "최골드", "정실버", "한브론즈", "강리거", "조본디", "윤로프", "장하네스", "임세이프", "오워커", "신스타",
];
const SILVER_NAMES = [
  "서실버", "홍실버", "문실버", "양실버", "권실버", "황실버", "안실버", "송실버", "류실버", "전실버",
  "정실버", "고실버", "손실버", "배실버", "백실버",
];
const BRONZE_NAMES = [
  "허브론즈", "남브론즈", "심브론즈", "노브론즈", "하브론즈", "곽브론즈", "성브론즈", "차브론즈", "주브론즈", "우브론즈",
  "라브론즈", "소브론즈", "석브론즈", "진브론즈", "민브론즈", "연브론즈", "구브론즈", "나브론즈", "도브론즈", "반브론즈",
];

/** 상세 정보 샘플 (인덱스별로 순환 적용) */
const SAMPLE_GENDERS = ["남", "여", "남", "여", "기타"] as const;
const SAMPLE_DIVISIONS = ["리거", "버니", "리거 & 버니"] as const;
const SAMPLE_BUNNY_RECRUIT = ["YES", "NO", "YES", "YES", "NO", "YES", "NO", "YES"] as const;
const SAMPLE_BONDAGE_RATING = ["YES", "NO", "YES", "YES", "NO", "YES", "NO", "YES"] as const;
const SAMPLE_STYLES = [
  "로프 위주, 가벼운 구속",
  "메탈/가죽, 강한 구속",
  "역할연기, 시나리오",
  "로프+역할연기",
  "가죽, 디스플레이",
  "로프 전문",
  "다양한 도구",
  "미니멀",
] as const;
const SAMPLE_BIOS = [
  "안전과 신뢰를 최우선으로 합니다. 처음 만나는 분이어도 편하게 연락 주세요.",
  "로프와 역할연기를 좋아합니다. 시나리오 맞춰서 함께해요.",
  "경력 5년차입니다. 상대방 페이스에 맞춰 진행해 드려요.",
  "본디지에 관심 많아 시작했어요. 같이 배워가요.",
  "레슨·입문 세션 가능합니다. 문의 환영.",
  "플레이 전 소통 충분히 하고 싶어요. 대화 먼저 해요.",
  "안전어·한도 사전에 꼭 이야기 나눕니다.",
  "다양한 스타일 시도 중이에요. 제안 환영합니다.",
] as const;

function getSampleProfile(index: number): Pick<Rigger, "gender" | "division" | "bunnyRecruit" | "bondageRating" | "style" | "bio"> {
  if (index === 0) {
    return {
      gender: "남",
      division: "리거",
      bunnyRecruit: "YES",
      bondageRating: "YES",
      style: "아트",
      bio: "아트 본디져 입니다.",
    };
  }
  return {
    gender: SAMPLE_GENDERS[index % SAMPLE_GENDERS.length],
    division: SAMPLE_DIVISIONS[index % SAMPLE_DIVISIONS.length],
    bunnyRecruit: SAMPLE_BUNNY_RECRUIT[index % SAMPLE_BUNNY_RECRUIT.length],
    bondageRating: SAMPLE_BONDAGE_RATING[index % SAMPLE_BONDAGE_RATING.length],
    style: SAMPLE_STYLES[index % SAMPLE_STYLES.length],
    bio: SAMPLE_BIOS[index % SAMPLE_BIOS.length],
  };
}

function fallbackFromName(name: string): string {
  if (name.length >= 2) return name.slice(0, 2);
  return name.slice(0, 1);
}

function buildRiggers(
  names: string[],
  tier: RiggerTier,
  startId: number,
): Rigger[] {
  return names.map((name, i) => ({
    id: `rigger-${startId + i}`,
    name,
    tier,
    avatarFallback: fallbackFromName(name),
  }));
}

/** 골드 10명: 2명씩 묶어 별 5→4→3→2→1 (최상위부터) */
function buildGoldRiggers(): Rigger[] {
  return GOLD_NAMES.map((name, i) => {
    const groupIndex = Math.floor(i / 2);
    const stars = 5 - groupIndex;
    return {
      id: `rigger-${3 + i}`,
      name,
      tier: "gold" as const,
      avatarFallback: fallbackFromName(name),
      stars,
    };
  });
}

/** 실버 15명: 3명씩 묶어 별 5→4→3→2→1 (최상위부터) */
function buildSilverRiggers(): Rigger[] {
  return SILVER_NAMES.map((name, i) => {
    const groupIndex = Math.floor(i / 3);
    const stars = 5 - groupIndex;
    return {
      id: `rigger-${13 + i}`,
      name,
      tier: "silver" as const,
      avatarFallback: fallbackFromName(name),
      stars,
    };
  });
}

/** 브론즈 20명: 4명씩 묶어 별 5→4→3→2→1 (최상위부터) */
function buildBronzeRiggers(): Rigger[] {
  return BRONZE_NAMES.map((name, i) => {
    const groupIndex = Math.floor(i / 4);
    const stars = 5 - groupIndex;
    return {
      id: `rigger-${28 + i}`,
      name,
      tier: "bronze" as const,
      avatarFallback: fallbackFromName(name),
      stars,
    };
  });
}

/** 마크용 이미지 (원형 영역에 표시) */
const MARK_IMAGES = [
  "/marks/mark-collar.png",
  "/marks/mark-gag.png",
  "/marks/mark-cuffs.png",
  "/marks/mark-whip.png",
] as const;

function withMarks<T extends { id: string }>(riggers: T[], startIndex: number): (T & { markImageUrl?: string })[] {
  return riggers.map((r, i) => {
    const url = i < 4 ? MARK_IMAGES[i] : MARK_IMAGES[i % 4];
    return { ...r, markImageUrl: url };
  });
}

export const DEFAULT_MARK_IMAGE_URL = MARK_IMAGES[0];

const MARK_LEGEND_URL = "/marks/mark-legend.png";

const _rawRiggers: Rigger[] = [
  ...buildRiggers(LEGEND_NAMES, "legend", 0).map((r, i) =>
    i === 0 ? { ...r, markImageUrl: MARK_LEGEND_URL } : i < 3 ? { ...r, markImageUrl: MARK_IMAGES[i - 1] } : r,
  ),
  ...withMarks(buildGoldRiggers(), 3),
  ...withMarks(buildSilverRiggers(), 13),
  ...withMarks(buildBronzeRiggers(), 28),
];

export const SAMPLE_RIGGERS: Rigger[] = _rawRiggers.map((r, i) => ({
  ...r,
  ...getSampleProfile(i),
}));

export function getRiggerById(id: string): Rigger | undefined {
  return SAMPLE_RIGGERS.find((r) => r.id === id);
}

/**
 * 로그인한 사용자와 매핑된 리거 프로필 id를 반환합니다.
 * (샘플: 치우천왕(rigger-0)을 현재 로그인 사용자로 고정. 실제 서비스에서는 DB rigger.userId 등으로 조회)
 */
export function getRiggerIdForUserId(_userId: string): string {
  return SAMPLE_RIGGERS[0]?.id ?? "rigger-0";
}

/** 로그인 사용자에게 매핑된 리거일 때 이름·아바타만 현재 로그인 정보로 덮어씁니다. 상세정보(성별·구분 등)는 샘플 데이터 유지. */
export function applyCurrentUserToRigger<T extends Rigger>(
  rigger: T,
  currentUserId: string | null,
  user: { name?: string | null; email?: string | null; image?: string | null },
): T {
  if (!currentUserId || getRiggerIdForUserId(currentUserId) !== rigger.id) return rigger;
  const displayName = (user.name?.trim() || user.email?.trim() || "회원").slice(0, 50);
  const fallback =
    displayName.length >= 2 ? displayName.slice(0, 2) : displayName.slice(0, 1);
  return {
    ...rigger,
    name: displayName,
    avatarUrl: user.image ?? rigger.avatarUrl,
    avatarFallback: fallback,
  };
}

export const TIER_ORDER: RiggerTier[] = ["legend", "gold", "silver", "bronze"];

export const TIER_LABELS: Record<RiggerTier, string> = {
  legend: "레전드",
  gold: "골드",
  silver: "실버",
  bronze: "브론즈",
};

export const TIER_STARS: Record<RiggerTier, number> = {
  legend: 4,
  gold: 3,
  silver: 2,
  bronze: 1,
};
