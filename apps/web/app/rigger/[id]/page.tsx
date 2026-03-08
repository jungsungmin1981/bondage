import Link from "next/link";
import { auth } from "@workspace/auth";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getRiggerById, TIER_LABELS } from "@/lib/rigger-sample";
import { RiggerTierCard } from "@/components/rigger-tier-card";

export default async function RiggerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) redirect("/login");

  const { id } = await params;
  const rigger = getRiggerById(id);
  if (!rigger) notFound();

  const tierLabel = TIER_LABELS[rigger.tier];
  const starCount = rigger.stars ?? 0;

  return (
    <div className="min-h-[calc(100svh-3.5rem)] p-4 sm:p-6">
      <Link
        href="/rigger"
        className="mb-6 inline-block text-sm text-muted-foreground underline-offset-2 hover:underline"
      >
        ← 리거 목록
      </Link>

      <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-[minmax(0,280px)_1fr] lg:gap-10">
        {/* 좌측: 등급 카드 */}
        <div className="flex justify-center sm:justify-start">
          <div className="w-full max-w-[280px]">
            <RiggerTierCard rigger={rigger} />
          </div>
        </div>

        {/* 우측: 기본 정보 */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            기본 정보
          </h1>
          <dl className="mt-6 space-y-4">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">닉네임</dt>
              <dd className="mt-1 text-lg font-medium">{rigger.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">등급</dt>
              <dd className="mt-1 text-lg font-medium">{tierLabel}</dd>
            </div>
            {starCount > 0 && (
              <div>
                <dt className="text-sm font-medium text-muted-foreground">별 개수</dt>
                <dd className="mt-1 text-lg font-medium">{starCount}개</dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-muted-foreground">ID</dt>
              <dd className="mt-1 font-mono text-sm text-muted-foreground">{rigger.id}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
