import { headers } from "next/headers";
import { auth } from "@workspace/auth";
import {
  getPendingRiggerProfiles,
  getReRequestedRiggerProfiles,
  getRejectedRiggerProfiles,
  getMemberProfileByUserId,
  getOperatorAllowedTabIds,
} from "@workspace/db";
import { isAdmin } from "@/lib/admin";
import { isOperatorAllowedPath } from "@/lib/admin-operator-permissions";
import { RiggerApprovalsList } from "../../riggers/rigger-approvals-list";

const PATH = "/admin/members/riggers";

export default async function AdminMembersRiggersPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return (
      <div className="max-w-2xl px-4 py-10">
        <h1 className="text-lg font-semibold">리거 승인</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          리거 승인을 보려면 먼저 로그인해 주세요.
        </p>
      </div>
    );
  }

  if (isAdmin(session)) {
    // 관리자: 통과
  } else {
    const profile = await getMemberProfileByUserId(session.user.id);
    const isApprovedOperator =
      profile?.memberType === "operator" && profile?.status === "approved";
    const pathname = (await headers()).get("x-pathname") ?? PATH;
    const allowedIds = isApprovedOperator
      ? await getOperatorAllowedTabIds(session.user.id)
      : [];
    if (
      !isApprovedOperator ||
      !isOperatorAllowedPath(allowedIds, pathname)
    ) {
      return (
        <div className="max-w-2xl px-4 py-10">
          <h1 className="text-lg font-semibold">리거 승인</h1>
          <p className="mt-4 text-sm text-muted-foreground">
            관리자만 접근할 수 있습니다.
          </p>
        </div>
      );
    }
  }

  const [pendingRows, reRequestedRows, rejectedRows] = await Promise.all([
    getPendingRiggerProfiles(),
    getReRequestedRiggerProfiles(),
    getRejectedRiggerProfiles(),
  ]);

  // DB에서 markImageUrl이 이미 포함되어 있으므로 별도 override 조회 불필요
  const items = pendingRows.map((row) => ({
    ...row,
    markImageUrl: row.markImageUrl ?? null,
  }));
  const reRequestedItems = reRequestedRows.map((row) => ({
    ...row,
    markImageUrl: row.markImageUrl ?? null,
  }));
  const rejectedItems = rejectedRows.map((row) => ({
    ...row,
    markImageUrl: row.markImageUrl ?? null,
  }));

  return (
    <div className="max-w-3xl px-4 py-10">
      <h1 className="text-lg font-semibold">리거 승인</h1>
      <RiggerApprovalsList
        items={items}
        reRequestedItems={reRequestedItems}
        rejectedItems={rejectedItems}
      />
    </div>
  );
}
