import { headers } from "next/headers";
import { auth } from "@workspace/auth";
import {
  getAllApprovalRequests,
  getApprovalRequestsForBunny,
} from "@workspace/db";
import { isAdmin } from "@/lib/admin";
import { BunnyApprovalsList } from "./bunny-approvals-list";

export default async function BunnyApprovalsPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-lg font-semibold">승인 요청</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          승인 요청을 보려면 먼저 로그인해 주세요.
        </p>
      </div>
    );
  }

  const items = isAdmin(session)
    ? await getAllApprovalRequests()
    : await getApprovalRequestsForBunny(session.user.id);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-lg font-semibold">승인 요청</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          승인요청 내역이 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-lg font-semibold">승인 요청</h1>
      <BunnyApprovalsList items={items} />
    </div>
  );
}
