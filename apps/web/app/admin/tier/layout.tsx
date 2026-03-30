import { auth } from "@workspace/auth";
import { getMemberProfileByUserId, getOperatorAllowedTabIds } from "@workspace/db";
import { headers } from "next/headers";
import { isAdmin } from "@/lib/admin";
import { getAllowedSubHrefsForTab } from "@/lib/admin-operator-permissions";
import { AdminTierTabs } from "./admin-tier-tabs";

export default async function AdminTierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const isAdminUser = session ? isAdmin(session) : false;
  const memberProfile = session
    ? await getMemberProfileByUserId(session.user.id)
    : null;
  const isApprovedOperator =
    memberProfile?.memberType === "operator" && memberProfile?.status === "approved";
  const operatorOnly = !isAdminUser && isApprovedOperator;

  const allowedHrefs =
    operatorOnly && session
      ? getAllowedSubHrefsForTab(
          await getOperatorAllowedTabIds(session.user.id),
          "tier",
        )
      : undefined;

  return (
    <div className="space-y-4">
      <AdminTierTabs allowedHrefs={allowedHrefs} />
      {children}
    </div>
  );
}
