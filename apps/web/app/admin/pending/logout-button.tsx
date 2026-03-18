"use client";

import { authClient } from "@/lib/auth-client";
import { Button } from "@workspace/ui/components/button";

export function PendingLogoutButton() {
  const handleSignOut = async () => {
    await authClient.signOut();
    window.location.href = "/";
  };

  return (
    <Button variant="outline" size="sm" onClick={handleSignOut} className="min-h-[44px] px-4">
      로그아웃
    </Button>
  );
}
