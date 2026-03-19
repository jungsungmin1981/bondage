import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@workspace/auth";
import { isAdmin, isPrimaryAdmin } from "@/lib/admin";
import { getMemberProfileByUserId, getOperatorAllowedTabIds } from "@workspace/db";
import { AdminTabs } from "./admin-tabs";
import { AdminOperatorRedirect } from "./admin-operator-redirect";
import { AdminLayoutContent } from "./admin-layout-content";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const isAdminUser = isAdmin(session);
  const memberProfile = await getMemberProfileByUserId(session.user.id);
  const isApprovedOperator =
    memberProfile?.memberType === "operator" && memberProfile?.status === "approved";
  const isPendingOperator =
    memberProfile?.memberType === "operator" && memberProfile?.status === "pending";

  if (!isAdminUser && !isApprovedOperator && !isPendingOperator) redirect("/");

  const operatorOnly = !isAdminUser && isApprovedOperator;
  const allowedTabIds = operatorOnly
    ? await getOperatorAllowedTabIds(session.user.id)
    : undefined;

  if (operatorOnly && (!allowedTabIds || allowedTabIds.length === 0)) {
    redirect("/?admin=no-permission");
  }

  /** 클라이언트에서 의존성 비교 시 참조 변경으로 인한 무한 실행 방지 */
  const allowedTabIdsKey = allowedTabIds ? allowedTabIds.slice().sort().join(",") : "";

  const sidebarAndMain = (
    <>
      <AdminOperatorRedirect operatorOnly={operatorOnly} allowedTabIds={allowedTabIds} allowedTabIdsKey={allowedTabIdsKey} />

      {/* 데스크탑: 좌측 사이드바 레이아웃 */}
      <div className="-ml-3 hidden sm:block sm:-ml-6">
        <aside
          className="fixed bottom-0 left-0 top-14 z-20 flex w-52 flex-col gap-4 border-r border-border bg-background py-6"
          style={{ paddingLeft: "max(1rem, env(safe-area-inset-left))", paddingRight: "1rem" }}
        >
          <h1 className="text-xl font-semibold sm:text-2xl">관리자</h1>
          <AdminTabs
            showInviteKeysTab={isPrimaryAdmin(session)}
            operatorOnly={operatorOnly}
            allowedTabIds={allowedTabIds}
          />
        </aside>
        <main className="min-h-0 min-w-0 py-6 sm:py-8" style={{ paddingLeft: "calc(13rem + env(safe-area-inset-left))" }}>
          <div className="px-4">{children}</div>
        </main>
      </div>

      {/* 모바일: 상단 드롭다운 메뉴 + 전체 너비 컨텐츠 */}
      <div className="block sm:hidden">
        <div className="px-4 pb-4 pt-4">
          <h1 className="mb-3 text-xl font-semibold">관리자</h1>
          <AdminTabs
            showInviteKeysTab={isPrimaryAdmin(session)}
            operatorOnly={operatorOnly}
            allowedTabIds={allowedTabIds}
          />
        </div>
        <main className="min-h-0 min-w-0 px-4 pb-8">
          {children}
        </main>
      </div>
    </>
  );

  return (
    <AdminLayoutContent isPendingOperator={isPendingOperator} sidebarAndMain={sidebarAndMain}>
      {children}
    </AdminLayoutContent>
  );
}

