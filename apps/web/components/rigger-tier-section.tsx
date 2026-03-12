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

export function RiggerTierSection({
  tier,
  riggers,
}: {
  tier: RiggerTier;
  riggers: Rigger[];
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
      <ul className="grid list-none grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-5 lg:gap-8">
        {riggers.map((rigger) => (
          <li key={rigger.id} className="min-w-0">
            <Link
              href={`/rigger/${rigger.id}`}
              className="block rounded-xl transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <RiggerTierCard rigger={rigger} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
