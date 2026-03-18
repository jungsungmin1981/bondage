import { ADMIN_TABS } from "./admin-tabs";

/** 운영진 탭 ID (클라이언트에서 사용, @workspace/db와 동일한 값 유지) */
export type OperatorTabId = "operators" | "members" | "class" | "notice" | "images";

/** 탭별 하위 메뉴 (라벨 + path prefix). pathPrefix 기준으로 pathname 매칭 */
export const ADMIN_TAB_SUB_OPTIONS: {
  tabId: OperatorTabId;
  label: string;
  defaultHref: string;
  subTabs: { id: string; label: string; pathPrefix: string }[];
}[] = [
  {
    tabId: "operators",
    label: "운영진",
    defaultHref: "/admin/operators",
    subTabs: [],
  },
  {
    tabId: "members",
    label: "회원관리",
    defaultHref: "/admin/members",
    subTabs: [
      { id: "riggers", label: "리거승인", pathPrefix: "/admin/members/riggers" },
      { id: "restrictions", label: "이용제한", pathPrefix: "/admin/members/restrictions" },
    ],
  },
  {
    tabId: "class",
    label: "클래스",
    defaultHref: "/admin/class",
    subTabs: [
      { id: "beginner", label: "초급", pathPrefix: "/admin/class/beginner" },
      { id: "intermediate", label: "중급", pathPrefix: "/admin/class/intermediate" },
      { id: "advanced", label: "고급", pathPrefix: "/admin/class/advanced" },
    ],
  },
  {
    tabId: "notice",
    label: "공지사항",
    defaultHref: "/admin/notice/rigger",
    subTabs: [
      { id: "rigger", label: "공지사항", pathPrefix: "/admin/notice/rigger" },
      { id: "qna", label: "Q & A", pathPrefix: "/admin/notice/qna" },
      { id: "bunny", label: "버니 전용 공지사항", pathPrefix: "/admin/notice/bunny" },
      { id: "bunny-qna", label: "버니 전용 Q & A", pathPrefix: "/admin/notice/bunny-qna" },
    ],
  },
  {
    tabId: "images",
    label: "이미지",
    defaultHref: "/admin/images",
    subTabs: [
      { id: "watermark", label: "워터마크", pathPrefix: "/admin/watermark" },
      { id: "main-background", label: "메인 백그라운드", pathPrefix: "/admin/images/main-background" },
      { id: "resize", label: "이미지 리사이징", pathPrefix: "/admin/images/resize" },
      { id: "bronze", label: "브론즈", pathPrefix: "/admin/images/bronze" },
      { id: "silver", label: "실버", pathPrefix: "/admin/images/silver" },
      { id: "gold", label: "골드", pathPrefix: "/admin/images/gold" },
      { id: "master", label: "마스터", pathPrefix: "/admin/images/master" },
      { id: "jail", label: "감옥", pathPrefix: "/admin/images/jail" },
      { id: "donation", label: "기부", pathPrefix: "/admin/images/donation" },
    ],
  },
];

/** pathPrefix 길이 내림차순 (긴 것 먼저 매칭). 탭 기본 경로(/admin/members 등)도 포함해 운영진 접근 허용 판단 */
const PATH_PREFIX_ENTRIES: { pathPrefix: string; tabId: OperatorTabId; subId: string | null }[] = (() => {
  const entries: { pathPrefix: string; tabId: OperatorTabId; subId: string | null }[] = [];
  for (const opt of ADMIN_TAB_SUB_OPTIONS) {
    entries.push({ pathPrefix: opt.defaultHref, tabId: opt.tabId, subId: null });
    for (const sub of opt.subTabs) {
      entries.push({ pathPrefix: sub.pathPrefix, tabId: opt.tabId, subId: sub.id });
    }
  }
  entries.sort((a, b) => b.pathPrefix.length - a.pathPrefix.length);
  return entries;
})();

/** pathname → tabId + subId (관리자 영역이 아니면 null) */
export function pathnameToTabSub(
  pathname: string,
): { tabId: OperatorTabId; subId: string | null } | null {
  if (
    pathname.startsWith("/admin/admin-only") ||
    pathname.startsWith("/admin/invite-keys") ||
    pathname.startsWith("/admin/operator-permissions")
  ) {
    return null;
  }
  // class-review → class의 하위로 매핑
  const normalized = pathname.startsWith("/admin/class-review/")
    ? pathname.replace(/^\/admin\/class-review\/(beginner|intermediate|advanced)(\/.*)?$/, "/admin/class/$1")
    : pathname;
  for (const { pathPrefix, tabId, subId } of PATH_PREFIX_ENTRIES) {
    if (normalized === pathPrefix || normalized.startsWith(pathPrefix + "/")) {
      return { tabId, subId };
    }
  }
  return null;
}

/** 허용 ID 목록으로 해당 path 접근 가능 여부 */
export function isOperatorAllowedPath(allowedIds: string[], pathname: string): boolean {
  const tabSub = pathnameToTabSub(pathname);
  if (!tabSub) return false;
  const { tabId, subId } = tabSub;
  if (allowedIds.includes(tabId)) return true;
  if (subId && allowedIds.includes(`${tabId}:${subId}`)) return true;
  return false;
}

/** 해당 탭에 대한 접근 권한이 하나라도 있으면 true (탭 전체 또는 하위 중 하나) */
export function hasTabAccess(allowedIds: string[], tabId: OperatorTabId): boolean {
  if (allowedIds.includes(tabId)) return true;
  const opt = ADMIN_TAB_SUB_OPTIONS.find((o) => o.tabId === tabId);
  const subIds = opt?.subTabs.map((s) => s.id) ?? [];
  if (!subIds.length) return allowedIds.includes(tabId);
  return subIds.some((sub) => allowedIds.includes(`${tabId}:${sub}`));
}

/** 해당 탭에서 접근 가능한 첫 경로 (사이드바 링크용) */
export function getFirstAllowedPathForTab(allowedIds: string[], tabId: OperatorTabId): string {
  const opt = ADMIN_TAB_SUB_OPTIONS.find((o) => o.tabId === tabId);
  if (!opt) return "/admin/operators";
  if (allowedIds.includes(tabId)) return opt.defaultHref;
  for (const sub of opt.subTabs) {
    if (allowedIds.includes(`${tabId}:${sub.id}`)) return sub.pathPrefix;
  }
  return opt.defaultHref;
}

/** 해당 탭에서 운영진이 접근 가능한 하위 경로 목록 (하위 탭 필터링용) */
export function getAllowedSubHrefsForTab(allowedIds: string[], tabId: OperatorTabId): string[] {
  const opt = ADMIN_TAB_SUB_OPTIONS.find((o) => o.tabId === tabId);
  if (!opt) return [];
  if (allowedIds.includes(tabId)) {
    return [opt.defaultHref, ...opt.subTabs.map((s) => s.pathPrefix)];
  }
  return opt.subTabs
    .filter((s) => allowedIds.includes(`${tabId}:${s.id}`))
    .map((s) => s.pathPrefix);
}

/** 허용된 탭 중 첫 탭의 첫 허용 경로 (리다이렉트용) */
export function getFirstAllowedPath(allowedIds: string[]): string {
  for (const tab of ADMIN_TABS) {
    if (hasTabAccess(allowedIds, tab.tabId as OperatorTabId)) {
      return getFirstAllowedPathForTab(allowedIds, tab.tabId as OperatorTabId);
    }
  }
  return "/admin/operators";
}
