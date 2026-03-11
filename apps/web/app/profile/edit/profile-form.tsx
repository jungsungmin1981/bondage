"use client";

import { MemberProfileForm } from "@/components/member-profile-form";
import { saveProfileAction } from "./actions";
import type { MemberProfileRow } from "@workspace/db";

type ProfileFormProps = {
  profile: MemberProfileRow;
};

export function ProfileForm({ profile }: ProfileFormProps) {
  return (
    <MemberProfileForm
      memberType={profile.memberType as "rigger" | "bunny"}
      initialValues={{
        nickname: profile.nickname,
        iconUrl: profile.iconUrl,
        bio: profile.bio,
        gender: profile.gender ?? undefined,
        division: profile.division,
        bunnyRecruit: profile.bunnyRecruit,
        bondageRating: profile.bondageRating,
        activityRegion: profile.activityRegion,
        style: profile.style,
      }}
      formAction={saveProfileAction}
      submitLabel="저장"
    />
  );
}
