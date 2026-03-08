import { auth } from "@workspace/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  applyCurrentUserToRigger,
  SAMPLE_RIGGERS,
  TIER_ORDER,
} from "@/lib/rigger-sample";
import { RiggerTierSection } from "@/components/rigger-tier-section";

export default async function RiggerPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) redirect("/login");

  return (
    <div className="min-h-[calc(100svh-3.5rem)] p-4 sm:p-6">
      <div className="mb-8">
        <h1 className="text-xl font-semibold sm:text-2xl">리거</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          등급별 리거를 확인하세요. 레전드, 골드, 실버, 브론즈 순으로 구성됩니다.
        </p>
      </div>

      <div className="flex flex-col gap-10">
        {TIER_ORDER.map((tier) => (
          <RiggerTierSection
            key={tier}
            tier={tier}
            riggers={SAMPLE_RIGGERS.filter((r) => r.tier === tier).map((r) =>
              applyCurrentUserToRigger(r, session.user.id, session.user),
            )}
          />
        ))}
      </div>
    </div>
  );
}
