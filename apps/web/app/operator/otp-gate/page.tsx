import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@workspace/auth";
import { getMemberProfileByUserId } from "@workspace/db";
import { db, schema, eq } from "@workspace/db";
import { isPrimaryAdmin } from "@/lib/admin";
import { verifyOtpVerifiedCookie, OTP_VERIFIED_COOKIE_NAME } from "@/lib/otp-verified-cookie";
import { OperatorOtpVerifyForm } from "./operator-otp-verify-form";

export default async function OperatorOtpGatePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const profile = await getMemberProfileByUserId(session.user.id);
  const isApprovedOperator =
    profile?.memberType === "operator" && profile?.status === "approved";
  const isPrimaryAdminUser = isPrimaryAdmin(session);
  if (!isApprovedOperator && !isPrimaryAdminUser) {
    redirect("/");
  }

  const [totpRow] = await db
    .select({ userId: schema.userTotp.userId })
    .from(schema.userTotp)
    .where(eq(schema.userTotp.userId, session.user.id))
    .limit(1);

  if (!totpRow) {
    redirect("/operator/setup-otp");
  }

  const cookieStore = await headers().then((h) => h.get("cookie") ?? "");
  const match = cookieStore.match(new RegExp(`${OTP_VERIFIED_COOKIE_NAME}=([^;]+)`));
  const cookieValue = match?.[1]?.trim();
  if (verifyOtpVerifiedCookie(cookieValue, session.user.id)) {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-md space-y-8 px-4 py-8">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          2단계 인증(OTP)
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          휴대폰 인증 앱에 표시되는 6자리 숫자를 입력해 주세요.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <OperatorOtpVerifyForm />
      </div>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/operator/setup-otp" className="underline hover:text-foreground">
          OTP를 새로 등록하려면
        </Link>
      </p>
    </div>
  );
}
