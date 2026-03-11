import { headers } from "next/headers";
import { auth } from "@workspace/auth";
import { getPendingRiggerProfiles } from "@workspace/db";
import { isAdmin } from "@/lib/admin";
import { RiggerApprovalsList } from "./rigger-approvals-list";

export default async function AdminRiggersPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-lg font-semibold">리거 승인</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          리거 승인을 보려면 먼저 로그인해 주세요.
        </p>
      </div>
    );
  }

  if (!isAdmin(session)) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-lg font-semibold">리거 승인</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          관리자만 접근할 수 있습니다.
        </p>
      </div>
    );
  }

  const items = await getPendingRiggerProfiles();

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-lg font-semibold">리거 승인</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          현재 대기 중인 리거가 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-lg font-semibold">리거 승인</h1>
      <RiggerApprovalsList items={items} />
    </div>
  );
}
