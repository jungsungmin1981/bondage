import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@workspace/auth";
import { getInviteKeyMemberTypeByUserId } from "@workspace/db";
import { UserCircle, Users } from "lucide-react";
import { Button } from "@workspace/ui/components/button";

export default async function OnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  let inviteKeyType: "rigger" | "bunny" | "operator" | null = null;
  if (session?.user?.id) {
    inviteKeyType = await getInviteKeyMemberTypeByUserId(session.user.id);
    if (inviteKeyType === "rigger") redirect("/onboarding/rigger");
    if (inviteKeyType === "bunny") redirect("/onboarding/bunny");
    if (inviteKeyType === "operator") redirect("/onboarding/operator");
    // 인증키에 종류가 없으면(레거시) 회원 종류 선택 화면 표시
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-blue-400/30 bg-blue-500/25 px-8 py-10 shadow-[0_0_40px_-10px_rgba(59,130,246,0.4)] backdrop-blur-xl sm:px-10 sm:py-12">
      <h1 className="text-center text-xl font-semibold text-blue-100">
        회원 종류를 선택해 주세요
      </h1>
      <p className="mt-2 text-center text-sm text-blue-200/90">
        리거 또는 버니 중 하나를 선택합니다.
      </p>
      <div className="mt-8 flex flex-col gap-4">
        <Button
          variant="outline"
          className="h-auto flex-col gap-2 border-blue-400/50 bg-blue-900/40 py-6 text-blue-100 hover:bg-blue-800/50"
          asChild
        >
          <Link href="/onboarding/rigger">
            <UserCircle className="size-10" strokeWidth={1.5} />
            <span className="text-base font-medium">리거</span>
            <span className="text-xs text-blue-200/80">
              프로필 입력 후 관리자 승인
            </span>
          </Link>
        </Button>
        <Button
          variant="outline"
          className="h-auto flex-col gap-2 border-blue-400/50 bg-blue-900/40 py-6 text-blue-100 hover:bg-blue-800/50"
          asChild
        >
          <Link href="/onboarding/bunny">
            <Users className="size-10" strokeWidth={1.5} />
            <span className="text-base font-medium">버니</span>
            <span className="text-xs text-blue-200/80">
              닉네임·아이콘 입력 후 바로 이용
            </span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
