import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@workspace/auth";
import {
  getMemberProfileByUserId,
  getOperatorAllowedTabIds,
  getTierConditionsByTier,
} from "@workspace/db";
import { isAdmin } from "@/lib/admin";
import { isOperatorAllowedPath } from "@/lib/admin-operator-permissions";
import { TierConditionsClient } from "../tier-conditions-client";

const VALID_TIERS = ["bronze", "silver", "gold", "legend"] as const;
type ValidTier = (typeof VALID_TIERS)[number];

const TIER_LABEL: Record<ValidTier, string> = {
  bronze: "브론즈",
  silver: "실버",
  gold: "골드",
  legend: "레전드",
};

export default async function AdminTierConditionsTierPage({
  params,
}: {
  params: Promise<{ tier: string }>;
}) {
  const { tier } = await params;
  if (!VALID_TIERS.includes(tier as ValidTier)) notFound();
  const validTier = tier as ValidTier;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return <AccessDenied />;
  if (!isAdmin(session)) {
    const profile = await getMemberProfileByUserId(session.user.id);
    const isOperator = profile?.memberType === "operator" && profile?.status === "approved";
    const pathname = (await headers()).get("x-pathname") ?? `/admin/tier/conditions/${tier}`;
    const allowedIds = isOperator ? await getOperatorAllowedTabIds(session.user.id) : [];
    if (!isOperator || !isOperatorAllowedPath(allowedIds, pathname)) {
      return <AccessDenied />;
    }
  }

  const conditions = await getTierConditionsByTier(validTier);

  return (
    <TierConditionsClient conditions={conditions} tier={validTier} tierLabel={TIER_LABEL[validTier]} />
  );
}

function AccessDenied() {
  return (
    <p className="mt-4 text-sm text-muted-foreground">관리자만 접근할 수 있습니다.</p>
  );
}
