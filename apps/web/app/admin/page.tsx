import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@workspace/auth";
import { isAdmin } from "@/lib/admin";
import { getMemberProfileByUserId, getOperatorAllowedTabIds } from "@workspace/db";
import { getFirstAllowedPath } from "@/lib/admin-operator-permissions";

export default async function AdminIndexPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const isAdminUser = isAdmin(session);
  const memberProfile = await getMemberProfileByUserId(session.user.id);
  const isApprovedOperator =
    memberProfile?.memberType === "operator" && memberProfile?.status === "approved";
  const isPendingOperator =
    memberProfile?.memberType === "operator" && memberProfile?.status === "pending";

  if (isPendingOperator) redirect("/admin/pending");
  if (!isAdminUser && isApprovedOperator) {
    const allowedTabIds = await getOperatorAllowedTabIds(session.user.id);
    redirect(allowedTabIds.length ? getFirstAllowedPath(allowedTabIds) : "/admin/operators");
  }
  redirect("/admin/members/riggers");
}

