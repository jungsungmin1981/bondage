import { cache } from "react";
import { listThreadsForUser } from "@workspace/db";

/** `/messages` 레이아웃·페이지가 같은 요청에서 `listThreadsForUser`를 두 번 부르지 않도록 */
export const getCachedDmThreadsForUser = cache((userId: string) =>
  listThreadsForUser(userId),
);
