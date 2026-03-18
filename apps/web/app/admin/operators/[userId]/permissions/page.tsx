import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@workspace/auth";
import { isAdmin } from "@/lib/admin";
import { getMemberProfileByUserId, getOperatorAllowedTabIds } from "@workspace/db";
import { OperatorPermissionsForm } from "./operator-permissions-form";

export default async function OperatorPermissionsPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  if (!isAdmin(session)) redirect("/");

  const { userId } = await params;
  const profile = await getMemberProfileByUserId(userId);
  const isApprovedOperator =
    profile?.memberType === "operator" && profile?.status === "approved";
  if (!isApprovedOperator) {
    redirect("/admin/operators");
  }

  const initialTabIds = await getOperatorAllowedTabIds(userId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">메뉴 권한 설정</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          이 운영진이 접근할 수 있는 메뉴와 하위 메뉴를 선택하세요.
        </p>
      </div>

      <OperatorPermissionsForm
        targetUserId={userId}
        initialTabIds={initialTabIds}
      />
    </div>
  );
}
