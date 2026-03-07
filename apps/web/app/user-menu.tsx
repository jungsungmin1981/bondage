"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@workspace/ui/components/button";

export function UserMenu() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return null;
  }

  if (!session) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.push("/login")}>
          로그인
        </Button>
        <Button size="sm" onClick={() => router.push("/register")}>
          회원가입
        </Button>
      </div>
    );
  }

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/login");
  };

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-muted-foreground">{session.user.email}</span>
      <Button variant="outline" size="sm" onClick={handleSignOut}>
        로그아웃
      </Button>
    </div>
  );
}

