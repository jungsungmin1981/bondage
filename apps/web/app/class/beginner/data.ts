export type ClassCard = {
  id: string;
  title: string;
  visibility?: "public" | "private";
  description?: string;
  extraImageUrls?: string[];
  /** 로프 두께 (mm), 6~12 */
  ropeThicknessMm?: number;
  /** 로프 길이 (m), 6~12 */
  ropeLengthM?: number;
  /** 수량, 1~10 */
  quantity?: number;
  imageUrl?: string | null;
  /** 동영상 URL (선택) */
  videoUrl?: string;
  /** 현재 사용자의 이 게시물 도전 상태. pending=심사중, approved=승인(완료), rejected=반려(뱃지 미표시) */
  myChallengeStatus?: "pending" | "approved" | "rejected";
  /** 도전 통계 — approved/pending/rejected 건수 */
  challengeApprovedCount?: number;
  challengePendingCount?: number;
  challengeRejectedCount?: number;
};
