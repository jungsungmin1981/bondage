import Link from "next/link";
import { cn } from "@workspace/ui/lib/utils";
import type { Rigger, RiggerTier } from "@/lib/rigger-sample";
import { TIER_LABELS } from "@/lib/rigger-sample";
import { RiggerTierCard } from "./rigger-tier-card";

/** 등급별 섹션 배경색 (은은하게) */
const TIER_BG: Record<RiggerTier, string> = {
  legend: "bg-purple-950/15",
  gold: "bg-amber-950/20",
  silver: "bg-slate-800/20",
  bronze: "bg-amber-900/25",
};

const JAIL_CARD_URL = "/jail-card.png";

export function RiggerTierSection({
  tier,
  riggers,
  suspendedUserIds,
}: {
  tier: RiggerTier;
  riggers: Rigger[];
  /** 계정 사용 제한 중인 userId 집합 (감옥 오버레이용) */
  suspendedUserIds?: Set<string>;
}) {
  const label = TIER_LABELS[tier];
  if (riggers.length === 0) return null;

  return (
    <section aria-labelledby={`rigger-tier-${tier}`} className={cn("rounded-xl px-4 py-5 sm:px-5 sm:py-6", TIER_BG[tier])}>
      <h2
        id={`rigger-tier-${tier}`}
        className="mb-4 text-lg font-semibold tracking-tight sm:text-xl"
      >
        {label}
      </h2>
      <ul className="grid list-none grid-cols-2 gap-4 sm:gap-6 lg:gap-8 sm:[grid-template-columns:repeat(auto-fill,minmax(min(100%,100px),280px))]">
        {riggers.map((rigger) => (
          <li key={rigger.id} className="min-w-0">
            <Link
              href={`/rigger/${rigger.id}`}
              className="block rounded-xl transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <div className="w-full min-w-0 max-w-[280px] rounded-xl shadow-[0_12px_28px_-8px_rgba(0,0,0,0.22)] transition-all duration-200 hover:-translate-y-2 hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.28)]">
                <RiggerTierCard
                rigger={rigger}
                jailOverlayUrl={
                  rigger.userId && suspendedUserIds?.has(rigger.userId)
                    ? JAIL_CARD_URL
                    : undefined
                }
              />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
