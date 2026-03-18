"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@workspace/ui/components/button";

export function UserMenu() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const pathname = usePathname();
  const [nickname, setNickname] = useState<string | null>(null);
  const [profileLink, setProfileLink] = useState<string | null>(null);
  /** 경로가 바뀔 때(예: 온보딩 저장 후 / 로 이동) 프로필 재조회해 닉네임·상세 링크 갱신 */
  const lastFetchedRef = useRef<{ userId: string; pathname: string } | null>(null);

  useEffect(() => {
    if (!session?.user?.id) {
      setNickname(null);
      setProfileLink(null);
      lastFetchedRef.current = null;
      return;
    }
    if (
      lastFetchedRef.current?.userId === session.user.id &&
      lastFetchedRef.current?.pathname === pathname
    ) {
      return;
    }
    lastFetchedRef.current = { userId: session.user.id, pathname };
    fetch("/api/me/profile")
      .then((res) => res.json())
      .then(
        (data: {
          nickname?: string;
          memberType?: string;
          profileId?: string;
          hasProfile?: boolean;
          operatorDetailUserId?: string;
        }) => {
          setNickname(data.nickname ?? null);
          if (data.operatorDetailUserId) {
            setProfileLink(
              `/admin/operators/${encodeURIComponent(data.operatorDetailUserId)}`,
            );
          } else if (data.memberType === "rigger" && data.profileId) {
            setProfileLink(`/rigger/${encodeURIComponent(data.profileId)}`);
          } else if (data.memberType === "bunny" && data.profileId) {
            setProfileLink(`/bunnies/${encodeURIComponent(data.profileId)}`);
          } else if (data.hasProfile) {
            setProfileLink("/profile/edit");
          } else {
            setProfileLink(null);
          }
        },
      )
      .catch(() => {
        setNickname(null);
        setProfileLink(null);
      });
  }, [session?.user?.id, pathname]);

  if (isPending) {
    return null;
  }

  if (!session) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/login")}
        className="min-h-[44px] min-w-[44px] px-3 sm:min-h-9 sm:min-w-0"
      >
        로그인
      </Button>
    );
  }

  const handleSignOut = async () => {
    await authClient.signOut();
    window.location.href = "/";
  };

  /** 닉네임 작성 완료 후에는 닉네임, 미완료 시 이메일(회원가입 아이디) 표시 */
  const displayName = nickname ?? session.user.email ?? "";

  return (
    <div className="flex items-center gap-2 text-sm sm:gap-3">
      <Button
        variant="ghost"
        size="sm"
        asChild
        className="max-w-[90px] min-h-[44px] min-w-[44px] shrink-0 truncate px-3 text-muted-foreground sm:max-w-[140px] sm:min-h-9 sm:min-w-0 md:max-w-[180px]"
      >
        <Link
          href={profileLink ?? pathname ?? "/"}
          title={
            profileLink
              ? profileLink.startsWith("/admin/operators")
                ? "운영진 상세로 이동"
                : "내 상세정보로 이동"
              : "현재 페이지로 이동"
          }
        >
          {displayName}
        </Link>
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleSignOut}
        className="min-h-[44px] min-w-[44px] shrink-0 px-3 sm:min-h-9 sm:min-w-0"
      >
        로그아웃
      </Button>
    </div>
  );
}

