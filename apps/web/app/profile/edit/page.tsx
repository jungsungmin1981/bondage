import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@workspace/auth";
import {
  getMemberProfileByUserId,
  getRiggerProfileById,
} from "@workspace/db";
import { redirect } from "next/navigation";
import { applyCurrentUserToRigger } from "@/lib/rigger-sample";
import { mapRiggerProfileToRigger } from "@/lib/rigger-from-db";
import { getRiggerOverride } from "@/lib/rigger-overrides";
import { OwnProfileTierColumn } from "@/app/rigger/[id]/own-profile-tier-column";
import { ProfileForm } from "./profile-form";
import { BunnyCardEditColumn } from "./bunny-card-edit-column";
import { resolveBunnyCardUrl } from "@/lib/bunny-default-card-config";

export default async function ProfileEditPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const profile = await getMemberProfileByUserId(session.user.id);
  if (!profile) redirect("/onboarding");

  const isRigger = profile.memberType === "rigger";
  let rigger: ReturnType<typeof mapRiggerProfileToRigger> | null = null;
  if (isRigger && profile.id) {
    const dbRigger = await getRiggerProfileById(profile.id);
    if (dbRigger) {
      const riggerRaw = mapRiggerProfileToRigger(dbRigger);
      const override = await getRiggerOverride(profile.id);
      const mergedRaw = override
        ? {
            ...riggerRaw,
            ...Object.fromEntries(
              Object.entries(override).filter(
                ([, v]) => v != null && v !== "",
              ),
            ),
          }
        : riggerRaw;
      rigger = applyCurrentUserToRigger(
        mergedRaw,
        session.user.id,
        session.user,
      );
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col p-4 sm:h-[calc(100dvh-4rem)] sm:overflow-hidden sm:p-6">
      <Link
        href={isRigger ? "/rigger" : "/"}
        className="mb-6 shrink-0 text-sm text-muted-foreground underline-offset-2 hover:underline"
      >
        {isRigger ? "← 리거 목록" : "← 홈"}
      </Link>

      <div className="mx-auto grid min-h-0 w-full max-w-4xl flex-1 gap-6 sm:grid-cols-[minmax(0,280px)_1fr] sm:grid-rows-[1fr] sm:items-start sm:gap-x-6 lg:gap-x-10">
        {isRigger && rigger ? (
          <OwnProfileTierColumn rigger={rigger} />
        ) : (
          <BunnyCardEditColumn
            profile={profile}
            displayCardUrl={resolveBunnyCardUrl(profile.cardImageUrl)}
          />
        )}

        <div className="min-h-0 min-w-0 overflow-y-auto rounded-xl border bg-card shadow-sm sm:col-start-2 sm:row-start-1">
          <div className="p-6">
            <ProfileForm profile={profile} />
          </div>
        </div>
      </div>
    </div>
  );
}
