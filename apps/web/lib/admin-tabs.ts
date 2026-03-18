import type { OperatorTabId } from "@workspace/db";

/** 관리자 전용 하위 탭 (인증키, 메뉴 권한) — 관리자 전용 탭 안에서만 노출 */
export const ADMIN_ONLY_SUB_TABS = [
  { tabId: "invite-keys" as const, label: "인증키", href: "/admin/invite-keys" },
  { tabId: "operator-permissions" as const, label: "메뉴 권한", href: "/admin/operator-permissions" },
] as const;

/** 사이드바용: 관리자 전용 단일 탭 (회원관리처럼 한 줄 탭) */
export const ADMIN_ONLY_TAB = {
  tabId: "admin-only" as const,
  label: "관리자 전용",
  href: "/admin/admin-only",
} as const;

/** 일반 탭 (운영진 권한 부여 대상) */
export const ADMIN_TABS = [
  { tabId: "operators" as const, label: "운영진", href: "/admin/operators", primaryAdminOnly: false },
  { tabId: "members" as const, label: "회원관리", href: "/admin/members", primaryAdminOnly: false },
  { tabId: "class" as const, label: "클래스", href: "/admin/class", primaryAdminOnly: false },
  { tabId: "notice" as const, label: "공지사항", href: "/admin/notice/bunny", primaryAdminOnly: false },
  { tabId: "images" as const, label: "이미지", href: "/admin/images", primaryAdminOnly: false },
] as const;

/** pathname에 해당하는 탭 ID (운영진 권한 체크용). 관리자 전용 탭은 운영진에게 없음. */
export function pathnameToTabId(pathname: string): OperatorTabId | "invite-keys" | "operator-permissions" | "admin-only" | null {
  if (pathname.startsWith("/admin/admin-only")) return "admin-only";
  if (pathname.startsWith("/admin/invite-keys")) return "invite-keys";
  if (pathname.startsWith("/admin/operator-permissions")) return "operator-permissions";
  if (pathname.startsWith("/admin/operators")) return "operators";
  if (pathname.startsWith("/admin/members")) return "members";
  if (pathname.startsWith("/admin/class")) return "class";
  if (pathname.startsWith("/admin/notice")) return "notice";
  if (pathname.startsWith("/admin/images") || pathname.startsWith("/admin/watermark")) return "images";
  return null;
}

export const OPERATOR_TAB_IDS: OperatorTabId[] = [
  "operators",
  "members",
  "class",
  "notice",
  "images",
];
