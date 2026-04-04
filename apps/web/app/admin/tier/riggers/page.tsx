import { headers } from "next/headers";
import {
  getOperatorAllowedTabIds,
  getRiggerTierList,
} from "@workspace/db";
import { getAuthSession } from "@/lib/server-session";
import { getMemberProfileForRequest } from "@/lib/cached-member-profile-request";
import { isAdmin } from "@/lib/admin";
import { isOperatorAllowedPath } from "@/lib/admin-operator-permissions";
import { RiggerTierListClient } from "./rigger-tier-list-client";

const PATH = "/admin/tier/riggers";

export default async function AdminTierRiggersPage() {
  const session = await getAuthSession();
  if (!session) return <AccessDenied />;
  if (!isAdmin(session)) {
    const profile = await getMemberProfileForRequest(session.user.id);
    const isOperator = profile?.memberType === "operator" && profile?.status === "approved";
    const pathname = (await headers()).get("x-pathname") ?? PATH;
    const allowedIds = isOperator ? await getOperatorAllowedTabIds(session.user.id) : [];
    if (!isOperator || !isOperatorAllowedPath(allowedIds, pathname)) {
      return <AccessDenied />;
    }
  }

  const riggers = await getRiggerTierList();

  return (
    <div className="max-w-3xl px-4 py-8">
      <h1 className="mb-1 text-lg font-semibold">리거 등급 관리</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        리거별 현재 등급과 별 수를 확인하고 수동으로 변경하거나 전체 재계산할 수 있습니다.
      </p>
      <RiggerTierListClient riggers={riggers} />
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="max-w-2xl px-4 py-10">
      <h1 className="text-lg font-semibold">리거 등급 관리</h1>
      <p className="mt-4 text-sm text-muted-foreground">관리자만 접근할 수 있습니다.</p>
    </div>
  );
}
