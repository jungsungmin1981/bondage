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
  /** 현재 사용자가 이 게시물에 도전 신청함(심사중) */
  hasMyChallenge?: boolean;
};
