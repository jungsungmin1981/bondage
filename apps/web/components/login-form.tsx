"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, User } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { SocialAuthIcons } from "@/components/social-auth-icons";

/** 로그인 실패 시 서버 메시지를 한글로 변환 */
function getLoginErrorMessage(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid") && (lower.includes("password") || lower.includes("credential")))
    return "이메일 또는 비밀번호가 올바르지 않습니다.";
  if (lower.includes("email_not_found") || lower.includes("email not found"))
    return "등록되지 않은 이메일입니다.";
  if (lower.includes("password") && (lower.includes("wrong") || lower.includes("invalid")))
    return "비밀번호가 올바르지 않습니다.";
  if (lower.includes("user not found"))
    return "등록된 계정이 없습니다.";
  if (lower.includes("too many") || lower.includes("rate limit"))
    return "시도 횟수가 너무 많습니다. 잠시 후 다시 시도해 주세요.";
  return "로그인에 실패했습니다. 이메일과 비밀번호를 확인해 주세요.";
}

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);

    const { error: signInError } = await authClient.signIn.email(
      {
        email,
        password,
        callbackURL: "/",
        rememberMe: true,
      },
      {
        onError: (ctx) => {
          setError(getLoginErrorMessage(ctx.error.message));
        },
      },
    );

    setPending(false);
    if (signInError) {
      const msg =
        typeof signInError === "string"
          ? signInError
          : (signInError as { message?: string }).message ?? "Login failed";
      setError((prev) => prev ?? getLoginErrorMessage(msg));
    } else {
      router.push("/");
    }
  };

  return (
    <div
      className={cn(
        "relative rounded-2xl border border-blue-400/30 bg-blue-500/25 px-8 py-10 shadow-[0_0_40px_-10px_rgba(59,130,246,0.4)] backdrop-blur-xl sm:px-10 sm:py-12",
        className,
      )}
      {...props}
    >
      {/* Header icon - bright vibrant blue outline */}
      <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
        <div className="flex size-16 items-center justify-center rounded-full border-2 border-blue-400 bg-blue-500/30 shadow-lg backdrop-blur">
          <User className="size-8 text-blue-300" strokeWidth={1.5} />
        </div>
      </div>

      <div className="pt-6">
        <form onSubmit={onSubmit} className="flex flex-col gap-6">
          {/* Email - rounded translucent field */}
          <div className="flex items-center gap-3 rounded-xl border border-blue-400/20 bg-blue-900/40 px-4 py-3 focus-within:border-blue-400/50 focus-within:ring-2 focus-within:ring-blue-400/20">
            <User className="size-5 shrink-0 text-blue-300/90" strokeWidth={1.5} />
            <Input
              id="email"
              type="email"
              placeholder="Username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={pending}
              className="min-h-0 flex-1 border-0 bg-transparent p-0 text-blue-100 placeholder:text-blue-300/70 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>

          {/* Password */}
          <div className="flex items-center gap-3 rounded-xl border border-blue-400/20 bg-blue-900/40 px-4 py-3 focus-within:border-blue-400/50 focus-within:ring-2 focus-within:ring-blue-400/20">
            <Lock className="size-5 shrink-0 text-blue-300/90" strokeWidth={1.5} />
            <Input
              id="password"
              type="password"
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={pending}
              className="min-h-0 flex-1 border-0 bg-transparent p-0 text-blue-100 placeholder:text-blue-300/70 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>

          {error && (
            <p className="text-sm text-red-300">{error}</p>
          )}

          {/* LOGIN button - solid vibrant blue, slight gradient, white text */}
          <Button
            type="submit"
            disabled={pending}
            className="h-12 w-full rounded-xl bg-gradient-to-b from-blue-500 to-blue-600 text-base font-medium uppercase tracking-wide text-white shadow-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50"
          >
            {pending ? "Signing in..." : "Login"}
          </Button>
        </form>

        <SocialAuthIcons className="mt-6" />
      </div>
    </div>
  );
}
