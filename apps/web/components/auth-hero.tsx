"use client";

import { usePathname } from "next/navigation";

export function AuthHero() {
  const pathname = usePathname();
  const isSignUp = pathname === "/register";
  const action = isSignUp ? "SIGN UP" : "SIGN IN";

  return (
    <div className="relative z-10">
      <p className="text-3xl font-medium tracking-tight text-white md:text-4xl">
        {action} TO YOUR
      </p>
      <p className="mt-1 bg-gradient-to-r from-fuchsia-400 via-purple-400 to-violet-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent md:text-5xl">
        ADVENTURE!
      </p>
    </div>
  );
}
