"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@workspace/ui/components/button";

type UserMenuProps = {
  nickname: string | null;
  profileLink: string | null;
  isLoggedIn: boolean;
};

export function UserMenu({ nickname, profileLink, isLoggedIn }: UserMenuProps) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  if (!isLoggedIn) {
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
    setSigningOut(true);
    await authClient.signOut();
    window.location.href = "/";
  };

  const displayName = nickname ?? "";

  return (
    <div className="flex items-center gap-2 text-sm sm:gap-3">
      <Button
        variant="ghost"
        size="sm"
        asChild
        className="max-w-[90px] min-h-[44px] min-w-[44px] shrink-0 truncate px-3 text-muted-foreground sm:max-w-[140px] sm:min-h-9 sm:min-w-0 md:max-w-[180px]"
      >
        <Link
          href={profileLink ?? "/"}
          title={
            profileLink
              ? profileLink.startsWith("/admin/operators")
                ? "운영진 상세로 이동"
                : "내 상세정보로 이동"
              : "홈으로 이동"
          }
        >
          {displayName}
        </Link>
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleSignOut}
        disabled={signingOut}
        className="min-h-[44px] min-w-[44px] shrink-0 px-3 sm:min-h-9 sm:min-w-0"
      >
        로그아웃
      </Button>
    </div>
  );
}
