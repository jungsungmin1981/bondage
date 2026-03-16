"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { cn } from "@workspace/ui/lib/utils";

const inputBoxClass =
  "flex items-center gap-3 rounded-xl border border-blue-400/20 bg-blue-900/40 px-4 py-3 focus-within:border-blue-400/50 focus-within:ring-2 focus-within:ring-blue-400/20";
const inputFieldClass =
  "min-h-0 flex-1 border-0 bg-transparent p-0 text-blue-100 placeholder:text-blue-300/70 focus-visible:ring-0 focus-visible:ring-offset-0";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const errorParam = searchParams.get("error");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (errorParam === "INVALID_TOKEN" || !token) {
    return (
      <div
        className={cn(
          "relative rounded-2xl border border-blue-400/30 bg-blue-500/25 px-8 py-10 shadow-[0_0_40px_-10px_rgba(59,130,246,0.4)] backdrop-blur-xl sm:px-10 sm:py-12",
        )}
      >
        <p className="text-center text-blue-100">
          링크가 만료되었거나 유효하지 않습니다. 비밀번호 찾기를 다시 시도해 주세요.
        </p>
        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="text-sm font-medium text-blue-200 underline-offset-2 hover:text-blue-100 hover:underline"
          >
            로그인으로 이동
          </Link>
        </div>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (newPassword.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    setPending(true);
    const { error: resetError } = await authClient.resetPassword({
      newPassword,
      token,
    });
    setPending(false);
    if (resetError) {
      setError(
        typeof resetError === "string" ? resetError : (resetError as { message?: string }).message ?? "재설정에 실패했습니다.",
      );
      return;
    }
    router.push("/login?reset=success");
  };

  return (
    <div
      className={cn(
        "relative rounded-2xl border border-blue-400/30 bg-blue-500/25 px-8 py-10 shadow-[0_0_40px_-10px_rgba(59,130,246,0.4)] backdrop-blur-xl sm:px-10 sm:py-12",
      )}
    >
      <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
        <div className="flex size-16 items-center justify-center rounded-full border-2 border-blue-400 bg-blue-500/30 shadow-lg backdrop-blur">
          <Lock className="size-8 text-blue-300" strokeWidth={1.5} />
        </div>
      </div>
      <div className="pt-6">
        <h1 className="text-center text-lg font-semibold text-blue-100">
          새 비밀번호 입력
        </h1>
        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-6">
          <div className={inputBoxClass}>
            <Lock className="size-5 shrink-0 text-blue-300/90" strokeWidth={1.5} />
            <Input
              type="password"
              placeholder="새 비밀번호 (8자 이상)"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={pending}
              className={inputFieldClass}
            />
          </div>
          <div className={inputBoxClass}>
            <Lock className="size-5 shrink-0 text-blue-300/90" strokeWidth={1.5} />
            <Input
              type="password"
              placeholder="비밀번호 확인"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={pending}
              className={inputFieldClass}
            />
          </div>
          {error && <p className="text-sm text-red-300">{error}</p>}
          <Button
            type="submit"
            disabled={pending}
            className="h-12 w-full rounded-xl bg-gradient-to-b from-blue-500 to-blue-600 text-base font-medium uppercase tracking-wide text-white shadow-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50"
          >
            {pending ? "처리 중..." : "비밀번호 변경"}
          </Button>
        </form>
        <p className="mt-6 text-center">
          <Link
            href="/login"
            className="text-sm text-blue-200/90 underline-offset-2 hover:text-blue-100 hover:underline"
          >
            로그인으로 돌아가기
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-blue-400/30 bg-blue-500/25 px-8 py-10 text-center text-blue-200">
          로딩 중...
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
