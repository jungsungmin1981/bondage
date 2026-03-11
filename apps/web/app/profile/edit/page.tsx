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
    <div className="min-h-[calc(100svh-3.5rem)] p-4 sm:p-6">
      <Link
        href={isRigger ? "/rigger" : "/"}
        className="mb-6 inline-block text-sm text-muted-foreground underline-offset-2 hover:underline"
      >
        {isRigger ? "← 리거 목록" : "← 홈"}
      </Link>

      <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-[minmax(0,280px)_1fr] sm:grid-rows-[auto_auto] sm:gap-x-6 lg:gap-x-10">
        {isRigger && rigger ? (
          <OwnProfileTierColumn rigger={rigger} />
        ) : (
          <BunnyCardEditColumn profile={profile} />
        )}

        <div className="min-w-0 rounded-xl border bg-card shadow-sm sm:col-start-2 sm:row-span-2 sm:row-start-1">
          <div className="p-6">
            <ProfileForm profile={profile} />
          </div>
        </div>
      </div>
    </div>
  );
}
