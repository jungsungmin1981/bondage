import { auth } from "@workspace/auth";
import {
  getMemberProfileByUserId,
  getInviteKeyMemberTypeByUserId,
  getMonthlyHotpickTopRanking,
  getLatestCompletedHotpickMonth,
  getLatestPublicPosts,
  type HotpickRankRow,
} from "@workspace/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getMainBackgroundUrl } from "@/lib/main-background-config";
import { unstable_cache } from "next/cache";
import { LatestPostsSection } from "./latest-posts-section";

function getPrevMonthKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const prev = new Date(y, m - 1, 1);
  const py = prev.getFullYear();
  const pm = String(prev.getMonth() + 1).padStart(2, "0");
  return `${py}-${pm}-01`;
}

function getPrevMonthLabel(prevKey: string): string {
  const [y, m] = prevKey.split("-").map(Number);
  return `${y}년 ${m}월`;
}

const RANK_BADGE: Record<number, { label: string; border: string; glow: string; text: string }> = {
  1: { label: "🥇", border: "border-yellow-400/70", glow: "shadow-yellow-400/30", text: "text-yellow-300" },
  2: { label: "🥈", border: "border-slate-300/60",  glow: "shadow-slate-300/20",  text: "text-slate-300"  },
  3: { label: "🥉", border: "border-amber-600/60",  glow: "shadow-amber-600/20",  text: "text-amber-400"  },
};

function PodiumCard({ item }: { item: HotpickRankRow }) {
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
    <div className={`flex min-w-0 flex-col items-center ${isFirst ? "order-2" : item.rank === 2 ? "order-1" : "order-3"}`}>
      <span className="mb-1 text-lg sm:text-2xl">{badge.label}</span>
      <div className={`w-full overflow-hidden rounded-xl border-2 ${badge.border} shadow-lg ${badge.glow}`}>
        {profileHref ? (
          <Link href={profileHref} className="block">
            <div className="relative aspect-[3/4] w-full bg-black/40">
              <img src={item.imageUrl} alt={`${item.rank}위`} className="h-full w-full object-cover transition-opacity hover:opacity-80" />
            </div>
          </Link>
        ) : (
          <div className="relative aspect-[3/4] w-full bg-black/40">
            <img src={item.imageUrl} alt={`${item.rank}위`} className="h-full w-full object-cover" />
          </div>
        )}
      </div>
      <div className={`mt-1 text-center text-xs font-semibold ${badge.text}`}>{item.rank}위</div>
      <div className="mt-0.5 w-full truncate text-center text-[10px] text-white/70">
        {profileHref ? (
          <Link href={profileHref} className="hover:underline underline-offset-2">{item.nickname ?? "알 수 없음"}</Link>
        ) : (
          <span>{item.nickname ?? "알 수 없음"}</span>
        )}
      </div>
    </div>
  );
}

export default async function MainPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const profile = await getMemberProfileByUserId(session.user.id);
  if (!profile) {
    const inviteKeyType = await getInviteKeyMemberTypeByUserId(session.user.id);
    if (inviteKeyType === "rigger") redirect("/onboarding/rigger");
    if (inviteKeyType === "bunny") redirect("/onboarding/bunny");
    if (inviteKeyType === "operator") redirect("/onboarding/operator");
    redirect("/onboarding");
  }

  const displayName = profile.nickname?.trim() || session.user.name || session.user.email || "회원";
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
    ["hotpick-ranking-main"],
    { revalidate: 300 },
  );
  const { monthKey: resultMonthKey, ranking } = await getCachedRanking();
  const resultMonthLabel = getPrevMonthLabel(resultMonthKey);

  const getCachedLatestPosts = unstable_cache(
    () => getLatestPublicPosts(10),
    ["latest-public-posts-main"],
    { revalidate: 600, tags: ["latest-public-posts"] },
  );
  const latestPosts = await getCachedLatestPosts();

  return (
    <div className="relative min-h-[calc(100svh-3.5rem)] overflow-hidden">
      {/* 시범 운영 안내 배너 */}
      <div className="relative z-20 w-full bg-yellow-400 text-center py-4 px-4">
        <p className="text-base font-extrabold text-black sm:text-xl">
          ⚠️ 시범 운영 기간입니다.
        </p>
        <p className="text-base font-extrabold text-black sm:text-xl">
          정식 오픈 시 모든 데이터는 초기화됩니다.
        </p>
      </div>
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${mainBackgroundUrl})` }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-black/50" aria-hidden />

      <div className="relative z-10 p-6 sm:p-8">
        {/* 환영 */}
        <section className="mb-10">
          <h1 className="text-2xl font-semibold tracking-tight text-white drop-shadow-sm sm:text-3xl">
            안녕하세요, {displayName} 님
          </h1>
          <p className="mt-1 text-sm text-white/80">Bondage 메인에 오신 것을 환영합니다.</p>
        </section>

        {/* 월간 핫픽 결과 */}
        {ranking.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-5 text-center text-base font-semibold tracking-wide text-white/90 sm:text-lg">
              {resultMonthLabel} 핫픽 결과
            </h2>
            <div className="flex items-end gap-2 sm:gap-4">
              {ranking.map((item) => (
                <div
                  key={item.submissionId}
                  className={
                    item.rank === 1 ? "order-2 w-[38%]" : item.rank === 2 ? "order-1 w-[32%]" : "order-3 w-[26%]"
                  }
                >
                  <PodiumCard item={item} />
                </div>
              ))}
            </div>
            <p className="mt-5 text-center">
              <Link href="/showoff" className="text-xs text-white/50 underline-offset-2 hover:text-white/80 hover:underline">
                핫픽 보러가기 →
              </Link>
            </p>
          </section>
        )}

        {/* 최신 게시물 */}
        <LatestPostsSection posts={latestPosts} />

        <p className="mt-10 text-center text-xs text-white/60">헤더에서 로그아웃할 수 있습니다.</p>
      </div>
    </div>
  );
}
