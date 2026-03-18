import { headers } from "next/headers";
import { auth } from "@workspace/auth";
import { redirect } from "next/navigation";
import { getActiveSuspensionsWithProfile, getMemberProfileByUserId, getOperatorAllowedTabIds } from "@workspace/db";
import { isAdmin } from "@/lib/admin";
import { isOperatorAllowedPath } from "@/lib/admin-operator-permissions";
import { RestrictionsForm } from "./restrictions-form";

const PATH = "/admin/members/restrictions";

export default async function AdminMembersRestrictionsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

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
      redirect("/");
    }
  }

  const initialSuspensionList = await getActiveSuspensionsWithProfile(100);

  return (
    <div className="max-w-3xl px-4 py-10">
      <h1 className="text-lg font-semibold">이용제한</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        닉네임으로 회원을 검색한 뒤 정지 기간을 선택해 이용제한을 적용합니다. 정지 기간 중에는 해당 회원의 프로필 페이지만 접속 가능합니다.
      </p>
      <div className="mt-6">
        <RestrictionsForm initialSuspensionList={initialSuspensionList} />
      </div>
    </div>
  );
}
