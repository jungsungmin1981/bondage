import { auth } from "@workspace/auth";
import { getApprovedRiggerProfiles, getSuspendedUserIds } from "@workspace/db";
import { headers } from "next/headers";
import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";
import {
  applyCurrentUserToRigger,
  TIER_ORDER,
} from "@/lib/rigger-sample";
import { mapRiggerProfileToRigger } from "@/lib/rigger-from-db";
import { RiggerTierSection } from "@/components/rigger-tier-section";

function getAdminExcludeForRiggerList() {
  const email = process.env.ADMIN_EMAIL?.trim();
  const username = process.env.ADMIN_USERNAME?.trim();
  return {
    excludeEmails: email ? [email] : [],
    excludeUsernames: username ? [username] : [],
  };
}

const getCachedApprovedRiggers = unstable_cache(
  (excludeEmails: string[], excludeUsernames: string[]) =>
    getApprovedRiggerProfiles({ excludeEmails, excludeUsernames }),
  ["approved-rigger-profiles"],
  { revalidate: 30 },
);

const getCachedSuspendedUserIds = unstable_cache(
  async () => {
    const set = await getSuspendedUserIds();
    return Array.from(set);
  },
  ["suspended-user-ids"],
  { revalidate: 30 },
);

export default async function RiggerPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) redirect("/login");

  const adminExclude = getAdminExcludeForRiggerList();
  const [approved, suspendedArr] = await Promise.all([
    getCachedApprovedRiggers(
      adminExclude.excludeEmails,
      adminExclude.excludeUsernames,
    ),
    getCachedSuspendedUserIds(),
  ]);
  const suspendedUserIds = new Set(suspendedArr);
  // DB에서 markImageUrl, profileVisibility 등이 이미 포함되어 있으므로 별도 override 조회 불필요
  const list = approved.map(mapRiggerProfileToRigger);
  const riggersByTier = TIER_ORDER.map((tier) =>
    list
      .filter((r) => r.tier === tier)
      .map((r) => applyCurrentUserToRigger(r, session.user.id, session.user))
      .sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0)),
  );
  const hasAny = riggersByTier.some((arr) => arr.length > 0);

  return (
    <div className="min-h-[calc(100svh-3.5rem)] p-4 sm:p-6">
      <div className="mb-8">
        <h1 className="text-xl font-semibold sm:text-2xl">리거</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          등급별 리거를 확인하세요. 마스터, 골드, 실버, 브론즈 순으로 구성됩니다.
        </p>
      </div>

      {!hasAny ? (
        <p className="text-sm text-muted-foreground">
          현재 등록된 리거가 없습니다. 승인된 리거가 있으면 여기에 표시됩니다.
        </p>
      ) : (
        <div className="flex flex-col gap-10">
          {TIER_ORDER.map((tier, idx) => (
            <RiggerTierSection
              key={tier}
              tier={tier}
              riggers={riggersByTier[idx] ?? []}
              suspendedUserIds={suspendedUserIds}
            />
          ))}
        </div>
      )}
    </div>
  );
}
