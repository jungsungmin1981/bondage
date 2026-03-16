/** 쪽지 출처 구분 — insert 시 사용 */
export const DIRECT_MESSAGE_SOURCE = {
  RIGGER_REJECTION: "rigger_rejection",
  CLASS_CHALLENGE_REJECTION: "class_challenge_rejection",
  BUNNY_REJECTION: "bunny_rejection",
  SUSPENSION_NOTICE: "suspension_notice",
  // ADMIN_NOTICE: "admin_notice",
} as const;

export type DirectMessageSourceValue =
  (typeof DIRECT_MESSAGE_SOURCE)[keyof typeof DIRECT_MESSAGE_SOURCE];
