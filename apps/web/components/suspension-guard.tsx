"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type SuspensionStatus = {
  suspended: boolean;
  profileId?: string;
  memberType?: string;
};

function getProfilePath(profileId: string, memberType: string): string {
  if (memberType === "rigger") return `/rigger/${profileId}`;
  return `/bunnies/${profileId}`;
}

export function SuspensionGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me/suspension-status")
      .then((res) => res.json() as Promise<SuspensionStatus>)
      .then((data) => {
        if (cancelled) return;
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
        router.replace(profilePath);
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
