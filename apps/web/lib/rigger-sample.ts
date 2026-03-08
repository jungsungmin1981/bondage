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
};

const LEGEND_NAMES = ["김레전드", "이마스터", "박치우"];
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

export const SAMPLE_RIGGERS: Rigger[] = [
  ...buildRiggers(LEGEND_NAMES, "legend", 0).map((r, i) =>
    i === 0 ? { ...r, markImageUrl: MARK_LEGEND_URL } : i < 3 ? { ...r, markImageUrl: MARK_IMAGES[i - 1] } : r,
  ),
  ...withMarks(buildGoldRiggers(), 3),
  ...withMarks(buildSilverRiggers(), 13),
  ...withMarks(buildBronzeRiggers(), 28),
];

export function getRiggerById(id: string): Rigger | undefined {
  return SAMPLE_RIGGERS.find((r) => r.id === id);
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
