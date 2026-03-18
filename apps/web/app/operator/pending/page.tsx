import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@workspace/auth";
import { getMemberProfileByUserId } from "@workspace/db";
import { isAdmin } from "@/lib/admin";

export default async function OperatorPendingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const profile = await getMemberProfileByUserId(session.user.id);
  const isOperator = profile?.memberType === "operator";
  const pending = isOperator && profile?.status !== "approved";
  if (!pending && !isAdmin(session)) {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-center">
        <h1 className="text-lg font-semibold text-foreground">
          운영진 승인 대기 중
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          관리자 승인 후 서비스를 이용할 수 있습니다.
          <br />
          승인되면 로그아웃 후 다시 로그인해 주세요.
        </p>
      </div>
    </div>
  );
}
