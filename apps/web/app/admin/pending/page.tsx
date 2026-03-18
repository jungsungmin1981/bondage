import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Hourglass } from "lucide-react";
import { auth } from "@workspace/auth";
import { getMemberProfileByUserId } from "@workspace/db";
import { isAdmin } from "@/lib/admin";
import { PendingLogoutButton } from "./logout-button";

export default async function AdminPendingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const memberProfile = await getMemberProfileByUserId(session.user.id);
  const isPendingOperator =
    memberProfile?.memberType === "operator" && memberProfile?.status === "pending";
  const isAdminUser = isAdmin(session);

  if (!isPendingOperator && !isAdminUser) redirect("/admin");

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card px-6 py-8 text-center shadow-sm sm:px-8 sm:py-10">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-muted/80 sm:mb-6 sm:size-16">
          <Hourglass className="size-7 text-muted-foreground sm:size-8" strokeWidth={1.75} aria-hidden />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          승인 대기중
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          관리자 승인 후 이용 가능합니다.
        </p>
        <div className="mt-8 flex justify-center sm:mt-10">
          <PendingLogoutButton />
        </div>
      </div>
    </div>
  );
}
