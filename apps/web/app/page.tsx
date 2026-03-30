import { auth } from "@workspace/auth";
import {
  getMemberProfileByUserId,
  getInviteKeyMemberTypeByUserId,
  getMonthlyHotpickTopRanking,
  getLatestCompletedHotpickMonth,
  type HotpickRankRow,
} from "@workspace/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Settings } from "lucide-react";
import { getMainBackgroundUrl } from "@/lib/main-background-config";
import { getMonthKey } from "@/lib/monthly-hotpick-period";
import { unstable_cache } from "next/cache";

/** 전월 키 "YYYY-MM-01" */
function getPrevMonthKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-based: 0 = 1월
  const prev = new Date(y, m - 1, 1);
  const py = prev.getFullYear();
  const pm = String(prev.getMonth() + 1).padStart(2, "0");
  return `${py}-${pm}-01`;
}

const RANK_BADGE: Record<number, { label: string; border: string; glow: string; text: string }> = {
  1: {
    label: "🥇",
    border: "border-yellow-400/70",
    glow: "shadow-yellow-400/30",
    text: "text-yellow-300",
  },
  2: {
    label: "🥈",
    border: "border-slate-300/60",
    glow: "shadow-slate-300/20",
    text: "text-slate-300",
  },
  3: {
    label: "🥉",
    border: "border-amber-600/60",
    glow: "shadow-amber-600/20",
    text: "text-amber-400",
  },
};

function PodiumCard({ item, prevMonthLabel }: { item: HotpickRankRow; prevMonthLabel: string }) {
  const badge = RANK_BADGE[item.rank];
  if (!badge) return null;

  const isFirst = item.rank === 1;
  const profileHref =
    item.profileId && item.memberType !== "operator"
      ? item.memberType === "rigger"
        ? `/rigger/${item.profileId}`
        : `/bunnies/${item.profileId}`
      : null;

  return (
    <div
      className={`flex flex-col items-center ${isFirst ? "order-2 scale-105 sm:scale-110" : item.rank === 2 ? "order-1" : "order-3"}`}
    >
      <span className={`mb-1 text-2xl sm:text-3xl ${isFirst ? "sm:text-4xl" : ""}`}>
        {badge.label}
      </span>
      <div
        className={`overflow-hidden rounded-xl border-2 ${badge.border} shadow-lg ${badge.glow} ${isFirst ? "w-28 sm:w-36" : "w-24 sm:w-28"}`}
      >
        {profileHref ? (
          <Link href={profileHref} className="block">
            <div className="relative aspect-[3/4] w-full bg-black/40">
              <img
                src={item.imageUrl}
                alt={`${item.rank}위`}
                className="h-full w-full object-cover transition-opacity hover:opacity-80"
              />
            </div>
          </Link>
        ) : (
          <div className="relative aspect-[3/4] w-full bg-black/40">
            <img
              src={item.imageUrl}
              alt={`${item.rank}위`}
              className="h-full w-full object-cover"
            />
          </div>
        )}
      </div>
      <div className={`mt-2 text-center ${isFirst ? "text-sm font-semibold" : "text-xs font-medium"} ${badge.text}`}>
        {item.rank}위
      </div>
      <div className="mt-0.5 max-w-[7rem] truncate text-center text-xs text-white/70">
        {profileHref ? (
          <Link href={profileHref} className="hover:underline underline-offset-2">
            {item.nickname ?? "알 수 없음"}
          </Link>
        ) : (
          <span>{item.nickname ?? "알 수 없음"}</span>
        )}
      </div>
    </div>
  );
}

function getPrevMonthLabel(prevKey: string): string {
  const [y, m] = prevKey.split("-").map(Number);
  return `${y}년 ${m}월`;
}

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
    if (inviteKeyType === "operator") redirect("/onboarding/operator");
    redirect("/onboarding");
  }

  const displayName = session.user.name ?? session.user.email ?? "회원";
  const mainBackgroundUrl = (await getMainBackgroundUrl()) ?? "/main-bg.png";

  const prevMonthKey = getPrevMonthKey();

  const getCachedRanking = unstable_cache(
    async () => {
      const prevRanking = await getMonthlyHotpickTopRanking(prevMonthKey, 3);
      if (prevRanking.length > 0) return { monthKey: prevMonthKey, ranking: prevRanking };

      const latestMonth = await getLatestCompletedHotpickMonth();
      if (!latestMonth || latestMonth === prevMonthKey) return { monthKey: prevMonthKey, ranking: [] };

      const fallbackRanking = await getMonthlyHotpickTopRanking(latestMonth, 3);
      return { monthKey: latestMonth, ranking: fallbackRanking };
    },
    [`hotpick-ranking-main`],
    { revalidate: 300 },
  );
  const { monthKey: resultMonthKey, ranking } = await getCachedRanking();
  const resultMonthLabel = getPrevMonthLabel(resultMonthKey);

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

        {/* 월간 핫픽 결과 */}
        {ranking.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-5 text-center text-base font-semibold tracking-wide text-white/90 sm:text-lg">
              {resultMonthLabel} 핫픽 결과
            </h2>
            <div className="flex items-end justify-center gap-4 sm:gap-8">
              {ranking.map((item) => (
                <PodiumCard key={item.submissionId} item={item} prevMonthLabel={resultMonthLabel} />
              ))}
            </div>
            <p className="mt-5 text-center">
              <Link
                href="/showoff"
                className="text-xs text-white/50 underline-offset-2 hover:text-white/80 hover:underline"
              >
                핫픽 보러가기 →
              </Link>
            </p>
          </section>
        )}

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
