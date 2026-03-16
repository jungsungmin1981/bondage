"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const SKIP_PREFIXES = ["/onboarding", "/login", "/register", "/reset-password", "/api"];

export function OnboardingRedirect() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!pathname) return;
    const skip = SKIP_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
    if (skip) return;

    let cancelled = false;
    fetch("/api/me/profile", { credentials: "include" })
      .then((res) => res.json())
      .then((data: { hasProfile?: boolean }) => {
        if (cancelled) return;
        if (data.hasProfile !== true) {
          router.replace("/onboarding");
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  return null;
}
