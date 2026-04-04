import { cache } from "react";
import { getMemberProfileByUserId } from "@workspace/db";

/** 동일 요청 내 중첩 레이아웃에서 `getMemberProfileByUserId` 중복 조회 방지 */
export const getMemberProfileForRequest = cache((userId: string) =>
  getMemberProfileByUserId(userId),
);
