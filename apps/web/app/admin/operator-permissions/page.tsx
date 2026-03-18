import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@workspace/auth";
import { isAdmin } from "@/lib/admin";
import { getOperatorUsers } from "@workspace/db";
import { UserCircle } from "lucide-react";
import { AdminOnlyTabs } from "../admin-only/admin-only-tabs";

export default async function OperatorPermissionsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  if (!isAdmin(session)) redirect("/");

  const operators = await getOperatorUsers();
  const approvedOperators = operators.filter((op) => op.status === "approved");

  return (
    <div className="space-y-6">
      <AdminOnlyTabs />
      <h2 className="text-lg font-semibold">메뉴 권한</h2>
      <p className="text-sm text-muted-foreground">
        승인된 운영진별로 관리자 화면에서 접근할 수 있는 메뉴를 설정합니다.
      </p>

      {approvedOperators.length === 0 ? (
        <p className="text-sm text-muted-foreground">승인된 운영진이 없습니다.</p>
      ) : (
        <ul className="grid list-none grid-cols-2 gap-4 sm:gap-6 lg:gap-8 sm:[grid-template-columns:repeat(auto-fill,minmax(min(100%,100px),280px))]">
          {approvedOperators.map((op) => {
            const displayName = (
              op.nickname?.trim() ||
              op.name?.trim() ||
              op.username?.trim() ||
              op.email ||
              "—"
            ).slice(0, 50);

            return (
              <li key={op.id} className="min-w-0">
                <Link
                  href={`/admin/operators/${encodeURIComponent(op.id)}/permissions`}
                  className="block rounded-xl transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <div className="relative flex w-full flex-col items-center">
                    <div className="w-full min-w-0 max-w-[280px] rounded-xl shadow-[0_12px_28px_-8px_rgba(0,0,0,0.22)] transition-all duration-200 hover:-translate-y-2 hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.28)]">
                      <div className="relative flex w-full min-w-0 max-w-[280px] flex-col overflow-hidden rounded-xl border-2 border-border bg-muted/30 aspect-[3/4] min-h-[190px] sm:min-h-[210px]">
                        {op.cardImageUrl?.trim() ? (
                          <img
                            src={op.cardImageUrl}
                            alt=""
                            className="h-full w-full object-cover object-center"
                          />
                        ) : (
                          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-center">
                            <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-muted">
                              <UserCircle className="size-10 text-muted-foreground" />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">
                              운영진
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <p
                      className="mt-2 w-full min-w-0 truncate text-center text-sm font-medium text-foreground"
                      title={displayName}
                    >
                      {displayName}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
