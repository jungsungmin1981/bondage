import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@workspace/auth";
import { db, eq, getMemberProfileByUserId, schema } from "@workspace/db";
import { isAdmin, isPrimaryAdmin } from "@/lib/admin";
import { OtpSetupForm } from "./otp-setup-form";

export default async function OperatorSetupOtpPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const profile = await getMemberProfileByUserId(session.user.id);
  const allowed = isAdmin(session) || profile?.memberType === "operator";
  if (!allowed) {
    redirect("/");
  }

  // 승인된 운영진이 이미 OTP 설정한 경우 상세 페이지로 바로 이동 (주 관리자는 재등록을 위해 항상 설정 화면 노출)
  const isPrimaryAdminUser = isPrimaryAdmin(session);
  const isApprovedOperator =
    profile?.memberType === "operator" && profile?.status === "approved";
  if (isApprovedOperator && !isPrimaryAdminUser) {
    const [totpRow] = await db
      .select({ userId: schema.userTotp.userId })
      .from(schema.userTotp)
      .where(eq(schema.userTotp.userId, session.user.id))
      .limit(1);
    if (totpRow) {
      redirect(`/admin/operators/${encodeURIComponent(session.user.id)}`);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          2단계 인증(OTP) 설정
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          로그인할 때 휴대폰 앱에서 나오는 6자리 숫자를 추가로 입력하면, 계정이
          더 안전해집니다.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <OtpSetupForm />
      </div>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/" className="underline hover:text-foreground">
          메인으로 돌아가기
        </Link>
      </p>
    </div>
  );
}
