import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@workspace/auth";
import { getOperatorUsersIncludingAdminIdentifiers, getMemberProfileByUserId } from "@workspace/db";
import { isAdmin } from "@/lib/admin";
import { UserCircle } from "lucide-react";

function getAdminIdentifiers() {
  const email = process.env.ADMIN_EMAIL;
  const username = process.env.ADMIN_USERNAME;
  return {
    adminEmails: typeof email === "string" && email.trim() ? [email.trim()] : [],
    adminUsernames: typeof username === "string" && username.trim() ? [username.trim()] : [],
  };
}

export default async function AdminOperatorsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const memberProfile = await getMemberProfileByUserId(session.user.id);
  const isApprovedOperator =
    memberProfile?.memberType === "operator" && memberProfile?.status === "approved";
  if (!isAdmin(session) && !isApprovedOperator) redirect("/");

  const { adminEmails, adminUsernames } = getAdminIdentifiers();
  const adminNickname = process.env.ADMIN_NICKNAME?.trim();
  const operators = await getOperatorUsersIncludingAdminIdentifiers(adminEmails, adminUsernames);

  const isPrimaryAdminRow = (op: { email: string; username?: string | null }) =>
    (adminEmails.length > 0 && op.email && adminEmails.includes(op.email)) ||
    (adminUsernames.length > 0 && op.username && adminUsernames.includes(op.username));

  return (
    <div className="min-h-[calc(100svh-3.5rem)] p-4 sm:p-6">
      <div className="mb-8">
        <h1 className="text-xl font-semibold sm:text-2xl">운영진</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          운영자 인증키로 가입한 계정과 주 관리자(ADMIN_EMAIL/ADMIN_USERNAME) 계정 목록입니다.
        </p>
      </div>

      {operators.length === 0 ? (
        <p className="text-sm text-muted-foreground">운영진이 없습니다.</p>
      ) : (
        <section
          aria-labelledby="operator-list-heading"
          className="rounded-xl bg-slate-50/90 dark:bg-slate-950/40 px-4 py-5 sm:px-5 sm:py-6"
        >
          <h2
            id="operator-list-heading"
            className="mb-4 text-lg font-semibold tracking-tight sm:text-xl"
          >
            운영진 회원
          </h2>
          <ul className="grid list-none grid-cols-2 gap-4 sm:gap-6 lg:gap-8 sm:[grid-template-columns:repeat(auto-fill,minmax(min(100%,100px),280px))]">
            {operators.map((op) => {
              const displayName = (
                (isPrimaryAdminRow(op) && adminNickname) ||
                op.nickname?.trim() ||
                op.name?.trim() ||
                op.username?.trim() ||
                op.email ||
                "—"
              ).slice(0, 50);

              return (
                <li key={op.id} className="min-w-0">
                  <Link
                    href={`/admin/operators/${encodeURIComponent(op.id)}`}
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
                          {op.status !== "approved" && (
                            <span className="absolute right-2 top-2 inline-flex rounded-full border border-amber-500/40 bg-amber-500/90 px-2.5 py-1 text-xs font-medium text-amber-950 dark:bg-amber-500/80 dark:text-amber-50">
                              승인대기
                            </span>
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
        </section>
      )}
    </div>
  );
}
