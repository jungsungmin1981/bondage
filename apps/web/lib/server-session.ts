import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "@workspace/auth";

/**
 * 동일 RSC/Route Handler/Server Action 요청 안에서 `auth.api.getSession` 중복 호출을 합친다.
 * (루트 레이아웃 + 하위 레이아웃 + 페이지 등에서 각각 호출되던 비용 감소)
 */
export const getAuthSession = cache(async () => {
  const h = await headers();
  return auth.api.getSession({ headers: h });
});
