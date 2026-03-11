import { auth } from "@workspace/auth";
import { getApprovedRiggerProfiles } from "@workspace/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  applyCurrentUserToRigger,
  TIER_ORDER,
} from "@/lib/rigger-sample";
import { getRiggerOverride } from "@/lib/rigger-overrides";
import { mapRiggerProfileToRigger } from "@/lib/rigger-from-db";
import { RiggerTierSection } from "@/components/rigger-tier-section";

export default async function RiggerPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) redirect("/login");

  const approved = await getApprovedRiggerProfiles();
  const list = approved.map(mapRiggerProfileToRigger);
  const listWithOverrides = await Promise.all(
    list.map(async (r) => {
      const override = await getRiggerOverride(r.id);
      if (!override) return r;
      return {
        ...r,
        ...Object.fromEntries(
          Object.entries(override).filter(([, v]) => v != null && v !== ""),
        ),
      };
    }),
  );
  const riggersByTier = TIER_ORDER.map((tier) =>
    listWithOverrides.filter((r) => r.tier === tier).map((r) =>
      applyCurrentUserToRigger(r, session.user.id, session.user),
    ),
  );
  const hasAny = riggersByTier.some((arr) => arr.length > 0);

  return (
    <div className="min-h-[calc(100svh-3.5rem)] p-4 sm:p-6">
      <div className="mb-8">
        <h1 className="text-xl font-semibold sm:text-2xl">리거</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          등급별 리거를 확인하세요. 레전드, 골드, 실버, 브론즈 순으로 구성됩니다.
        </p>
      </div>

      {!hasAny ? (
        <p className="text-sm text-muted-foreground">
          현재 등록된 리거가 없습니다. 승인된 리거가 있으면 여기에 표시됩니다.
        </p>
      ) : (
        <div className="flex flex-col gap-10">
          {TIER_ORDER.map((tier) => (
            <RiggerTierSection
              key={tier}
              tier={tier}
              riggers={riggersByTier[TIER_ORDER.indexOf(tier)]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
