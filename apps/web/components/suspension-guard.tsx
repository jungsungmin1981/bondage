"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type MeStatus = {
  suspended: boolean;
  riggerPending?: boolean;
  profileId?: string;
  memberType?: string;
};

function getProfilePath(profileId: string, memberType: string): string {
  if (memberType === "rigger") return `/rigger/${profileId}`;
  return `/bunnies/${profileId}`;
}

/** 리거 미승인 시 허용할 경로: 본인 리거 상세 및 그 하위만 */
function isAllowedForRiggerPending(
  pathname: string,
  profileId: string,
): boolean {
  const allowedBase = `/rigger/${profileId}`;
  return pathname === allowedBase || pathname.startsWith(`${allowedBase}/`);
}

export function SuspensionGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me/suspension-status")
      .then((res) => res.json() as Promise<MeStatus>)
      .then((data) => {
        if (cancelled) return;
        if (data.riggerPending && data.profileId && data.memberType === "rigger") {
          if (isAllowedForRiggerPending(pathname, data.profileId)) {
            setChecked(true);
            return;
          }
          const riggerTarget = getProfilePath(data.profileId, "rigger");
          if (pathname !== riggerTarget) router.replace(riggerTarget);
          return;
        }
        if (!data.suspended || !data.profileId || !data.memberType) {
          setChecked(true);
          return;
        }
        const profilePath = getProfilePath(data.profileId, data.memberType);
        const onProfilePage =
          pathname === profilePath || pathname.startsWith(profilePath + "/");
        const onPhotosPage =
          pathname === profilePath + "/photos" ||
          pathname.startsWith(profilePath + "/photos/");
        const onNotesPage =
          pathname === "/notes" || pathname.startsWith("/notes/");
        if ((onProfilePage && !onPhotosPage) || onNotesPage) {
          setChecked(true);
          return;
        }
        if (pathname !== profilePath) router.replace(profilePath);
      })
      .catch(() => setChecked(true))
      .finally(() => {
        if (!cancelled) setChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  return <>{children}</>;
}
