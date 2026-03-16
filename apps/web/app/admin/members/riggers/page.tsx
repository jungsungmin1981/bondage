import { headers } from "next/headers";
import { auth } from "@workspace/auth";
import {
  getPendingRiggerProfiles,
  getReRequestedRiggerProfiles,
  getRejectedRiggerProfiles,
} from "@workspace/db";
import { isAdmin } from "@/lib/admin";
import { getRiggerOverride } from "@/lib/rigger-overrides";
import { RiggerApprovalsList } from "../../riggers/rigger-approvals-list";

export default async function AdminMembersRiggersPage() {
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

  const [pendingRows, reRequestedRows, rejectedRows] = await Promise.all([
    getPendingRiggerProfiles(),
    getReRequestedRiggerProfiles(),
    getRejectedRiggerProfiles(),
  ]);

  const items = await Promise.all(
    pendingRows.map(async (row) => {
      const override = await getRiggerOverride(row.id);
      return { ...row, markImageUrl: override?.markImageUrl ?? null };
    }),
  );

  const reRequestedItems = await Promise.all(
    reRequestedRows.map(async (row) => {
      const override = await getRiggerOverride(row.id);
      return { ...row, markImageUrl: override?.markImageUrl ?? null };
    }),
  );

  const rejectedItems = await Promise.all(
    rejectedRows.map(async (row) => {
      const override = await getRiggerOverride(row.id);
      return { ...row, markImageUrl: override?.markImageUrl ?? null };
    }),
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-lg font-semibold">리거 승인</h1>
      <RiggerApprovalsList
        items={items}
        reRequestedItems={reRequestedItems}
        rejectedItems={rejectedItems}
      />
    </div>
  );
}
