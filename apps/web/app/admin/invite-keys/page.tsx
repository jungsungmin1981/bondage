import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@workspace/auth";
import { getOperatorProfilesForAdmin } from "@workspace/db";
import { isAdmin, isPrimaryAdmin } from "@/lib/admin";
import { AdminOnlyTabs } from "../admin-only/admin-only-tabs";
import { AdminInviteKeyForm } from "./admin-invite-key-form";
import { OperatorApprovalsList } from "./operator-approvals-list";

export default async function AdminInviteKeysPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  if (!isAdmin(session)) redirect("/");

  const operators = await getOperatorProfilesForAdmin();
  const showOperatorKey = isPrimaryAdmin(session);

  return (
    <div className="space-y-6">
      <AdminOnlyTabs />
      <h2 className="text-lg font-semibold">인증키</h2>

      <AdminInviteKeyForm showOperatorKey={showOperatorKey} />

      <hr className="border-border" />

      <section className="space-y-4">
        <h3 className="text-sm font-medium text-foreground">운영진</h3>
        <OperatorApprovalsList items={operators} />
      </section>
    </div>
  );
}
