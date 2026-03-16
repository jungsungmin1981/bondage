import { auth } from "@workspace/auth";
import {
  getMemberProfileByUserId,
  getInviteKeyMemberTypeByUserId,
} from "@workspace/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Users, Settings } from "lucide-react";
import { getMainBackgroundUrl } from "@/lib/main-background-config";

export default async function MainPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const profile = await getMemberProfileByUserId(session.user.id);
  if (!profile) {
    const inviteKeyType = await getInviteKeyMemberTypeByUserId(session.user.id);
    if (inviteKeyType === "rigger") redirect("/onboarding/rigger");
    if (inviteKeyType === "bunny") redirect("/onboarding/bunny");
    redirect("/onboarding");
  }

  const displayName = session.user.name ?? session.user.email ?? "회원";
  const mainBackgroundUrl = (await getMainBackgroundUrl()) ?? "/main-bg.png";

  return (
    <div className="relative min-h-[calc(100svh-3.5rem)] overflow-hidden">
      {/* 배경 이미지 */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${mainBackgroundUrl})` }}
        aria-hidden
      />
      {/* 어두운 오버레이 - 텍스트 가독성 */}
      <div className="absolute inset-0 bg-black/50" aria-hidden />

      {/* 본문 */}
      <div className="relative z-10 p-6 sm:p-8">
        {/* 환영 영역 */}
        <section className="mb-10">
          <h1 className="text-2xl font-semibold tracking-tight text-white drop-shadow-sm sm:text-3xl">
            안녕하세요, {displayName} 님
          </h1>
          <p className="mt-1 text-sm text-white/80">
            Bondage 메인에 오신 것을 환영합니다.
          </p>
        </section>

        {/* 바로가기 카드 */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/dashboard"
            className="group flex items-center gap-4 rounded-xl border border-white/20 bg-black/40 p-5 shadow-lg backdrop-blur-sm transition hover:border-white/40 hover:bg-black/50 hover:shadow-xl"
          >
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white">
              <LayoutDashboard className="size-6" />
            </div>
            <div>
              <h2 className="font-medium text-white group-hover:text-white">
                대시보드
              </h2>
              <p className="text-sm text-white/70">
                요약 정보를 확인하세요
              </p>
            </div>
          </Link>

          <Link
            href="/users"
            className="group flex items-center gap-4 rounded-xl border border-white/20 bg-black/40 p-5 shadow-lg backdrop-blur-sm transition hover:border-white/40 hover:bg-black/50 hover:shadow-xl"
          >
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white">
              <Users className="size-6" />
            </div>
            <div>
              <h2 className="font-medium text-white group-hover:text-white">
                사용자
              </h2>
              <p className="text-sm text-white/70">
                사용자 목록 보기
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-black/20 p-5 opacity-80 backdrop-blur-sm">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white/70">
              <Settings className="size-6" />
            </div>
            <div>
              <h2 className="font-medium text-white/70">설정</h2>
              <p className="text-sm text-white/50">준비 중입니다</p>
            </div>
          </div>
        </section>

        {/* 하단 안내 */}
        <p className="mt-10 text-center text-xs text-white/60">
          헤더에서 로그아웃할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
