"use client";

import Link from "next/link";
import { UserPlus } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@workspace/ui/lib/utils";

const iconButtonClass =
  "flex size-12 shrink-0 items-center justify-center rounded-full shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent";

export function SocialAuthIcons({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex items-center justify-center gap-4", className)}
      {...props}
    >
      {/* 회원가입 - 블루 아이콘 */}
      <Link
        href="/register"
        aria-label="회원가입"
        className={cn(
          iconButtonClass,
          "border border-blue-400/50 bg-blue-500/20 hover:bg-blue-500/35 focus:ring-blue-400/40",
        )}
      >
        <UserPlus className="size-6 text-blue-300" strokeWidth={2} />
      </Link>

      {/* 카카오톡 - 로그인/회원가입 (기존 회원 로그인, 없으면 카카오 연동 회원가입) */}
      <button
        type="button"
        aria-label="카카오톡으로 로그인"
        className={cn(
          iconButtonClass,
          "border border-[#FEE500] bg-[#FEE500] focus:ring-[#FEE500]/50",
        )}
        onClick={() => {
          authClient.signIn.oauth2({
            providerId: "kakao",
            callbackURL: "/",
            errorCallbackURL: "/login?error=oauth",
          });
        }}
      >
        <svg
          className="size-9"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <path
            d="M12 3c-5.52 0-10 3.59-10 8 0 2.86 1.89 5.39 4.72 6.82-.2.72-.74 2.63-.84 3.04-.13.48.18.47.41.34.17-.1 2.69-1.84 3.8-2.62.66.1 1.34.15 2.03.15 5.52 0 10-3.59 10-8s-4.48-8-10-8z"
            fill="#191919"
          />
        </svg>
      </button>

      {/* 네이버 - 로그인/회원가입 (기존 회원 로그인, 없으면 네이버 연동 회원가입) */}
      <button
        type="button"
        aria-label="네이버로 로그인"
        className={cn(
          iconButtonClass,
          "border border-[#03C75A] bg-[#03C75A] focus:ring-[#03C75A]/50",
        )}
        onClick={() => {
          authClient.signIn.oauth2({
            providerId: "naver",
            callbackURL: "/",
            errorCallbackURL: "/login?error=oauth",
          });
        }}
      >
        <svg
          className="size-6"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <path
            d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z"
            fill="#FFFFFF"
          />
        </svg>
      </button>

      {/* 구글(Google) - 로그인/회원가입 (기존 회원 로그인, 없으면 구글 연동 회원가입) */}
      <button
        type="button"
        aria-label="Google로 로그인"
        className={cn(
          iconButtonClass,
          "border border-gray-200 bg-white focus:ring-gray-400/50 dark:border-gray-600 dark:bg-gray-800",
        )}
        onClick={() => {
          authClient.signIn.social({
            provider: "google",
            callbackURL: "/",
          });
        }}
      >
        <svg
          className="size-6"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
      </button>
    </div>
  );
}
