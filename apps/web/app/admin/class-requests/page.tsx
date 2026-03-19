import { auth } from "@workspace/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { AdminClassSectionTabs } from "@/app/admin/admin-class-section-tabs";
import { AdminClassRequestsContent } from "./admin-class-requests-content";

export default async function AdminClassRequestsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !isAdmin(session)) redirect("/admin");

  return (
    <div className="space-y-4">
      <AdminClassSectionTabs />
      <div className="max-w-3xl">
        <AdminClassRequestsContent />
      </div>
    </div>
  );
}
