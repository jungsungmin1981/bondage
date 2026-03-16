"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, User, Mail } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";

/** 로그인 실패 시 서버 메시지를 한글로 변환 */
function getLoginErrorMessage(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("email") &&
    (lower.includes("verif") || lower.includes("verify") || lower.includes("unverified"))
  )
    return "이메일 인증이 필요합니다. 가입 시 발송된 이메일의 인증 링크를 확인해 주세요.";
  if (lower.includes("invalid") && (lower.includes("password") || lower.includes("credential")))
    return "ID 또는 비밀번호가 올바르지 않습니다.";
  if (lower.includes("user not found") || (lower.includes("username") && lower.includes("not found")))
    return "등록되지 않은 ID입니다.";
  if (lower.includes("password") && (lower.includes("wrong") || lower.includes("invalid")))
    return "비밀번호가 올바르지 않습니다.";
  if (lower.includes("too many") || lower.includes("rate limit"))
    return "시도 횟수가 너무 많습니다. 잠시 후 다시 시도해 주세요.";
  return "로그인에 실패했습니다. ID와 비밀번호를 확인해 주세요.";
}

const inputBoxClass =
  "flex items-center gap-3 rounded-xl border border-blue-400/20 bg-blue-900/40 px-4 py-3 focus-within:border-blue-400/50 focus-within:ring-2 focus-within:ring-blue-400/20";
const inputFieldClass =
  "min-h-0 flex-1 border-0 bg-transparent p-0 text-blue-100 placeholder:text-blue-300/70 focus-visible:ring-0 focus-visible:ring-offset-0";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotUsernameOpen, setForgotUsernameOpen] = useState(false);
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);

  useEffect(() => {
    if (searchParams.get("emailVerificationSent") === "1") {
      setEmailVerificationSent(true);
      window.history.replaceState({}, "", "/login");
    }
  }, [searchParams]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);

    const { error: signInError } = await authClient.signIn.username(
      {
        username: username.trim().toLowerCase(),
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
        {emailVerificationSent && (
          <p className="mb-4 rounded-lg border border-blue-400/40 bg-blue-500/20 px-4 py-3 text-sm text-blue-100">
            가입이 완료되었습니다. 입력하신 이메일로 인증 메일을 보냈습니다. 메일의 링크를 클릭한 뒤 로그인해 주세요.
          </p>
        )}
        <form onSubmit={onSubmit} className="flex flex-col gap-6">
          {/* ID - rounded translucent field */}
          <div className="flex items-center gap-3 rounded-xl border border-blue-400/20 bg-blue-900/40 px-4 py-3 focus-within:border-blue-400/50 focus-within:ring-2 focus-within:ring-blue-400/20">
            <User className="size-5 shrink-0 text-blue-300/90" strokeWidth={1.5} />
            <Input
              id="username"
              type="text"
              autoComplete="username"
              placeholder="ID"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))}
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

          <div className="flex justify-center gap-4 text-sm">
            <button
              type="button"
              onClick={() => setForgotUsernameOpen(true)}
              className="min-h-[44px] text-blue-200/90 underline-offset-2 hover:text-blue-100 hover:underline"
            >
              아이디 찾기
            </button>
            <button
              type="button"
              onClick={() => setForgotPasswordOpen(true)}
              className="min-h-[44px] text-blue-200/90 underline-offset-2 hover:text-blue-100 hover:underline"
            >
              비밀번호 찾기
            </button>
          </div>
        </form>
      </div>

      <ForgotPasswordDialog
        open={forgotPasswordOpen}
        onOpenChange={setForgotPasswordOpen}
      />
      <ForgotUsernameDialog
        open={forgotUsernameOpen}
        onOpenChange={setForgotUsernameOpen}
      />
    </div>
  );
}

function ForgotPasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    const { error: reqError } = await authClient.requestPasswordReset({
      email: email.trim(),
      redirectTo:
        typeof window !== "undefined"
          ? `${window.location.origin}/reset-password`
          : "/reset-password",
    });
    setPending(false);
    if (reqError) {
      setError(
        typeof reqError === "string"
          ? reqError
          : (reqError as { message?: string }).message ?? "요청에 실패했습니다.",
      );
      return;
    }
    setSent(true);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setEmail("");
      setError(null);
      setSent(false);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="border-blue-400/30 bg-blue-500/25 text-blue-100"
        showCloseButton={true}
      >
        <DialogHeader>
          <DialogTitle className="text-blue-100">비밀번호 찾기</DialogTitle>
          <DialogDescription className="sr-only">
            비밀번호 재설정 메일을 받을 이메일을 입력하세요.
          </DialogDescription>
        </DialogHeader>
        {sent ? (
          <p className="text-sm text-blue-200">
            입력한 이메일로 비밀번호 재설정 링크를 보냈습니다. 메일을 확인해 주세요.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className={inputBoxClass}>
              <Mail className="size-5 shrink-0 text-blue-300/90" strokeWidth={1.5} />
              <Input
                type="email"
                placeholder="가입 시 사용한 이메일"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={pending}
                className={inputFieldClass}
              />
            </div>
            {error && <p className="text-sm text-red-300">{error}</p>}
            <Button
              type="submit"
              disabled={pending}
              className="h-11 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
            >
              {pending ? "전송 중..." : "재설정 메일 받기"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ForgotUsernameDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/forgot-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "요청에 실패했습니다.");
        setPending(false);
        return;
      }
    } catch {
      setError("요청에 실패했습니다.");
    }
    setPending(false);
    setSent(true);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setEmail("");
      setError(null);
      setSent(false);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="border-blue-400/30 bg-blue-500/25 text-blue-100"
        showCloseButton={true}
      >
        <DialogHeader>
          <DialogTitle className="text-blue-100">아이디 찾기</DialogTitle>
          <DialogDescription className="sr-only">
            가입 시 사용한 이메일을 입력하면 아이디를 메일로 보내드립니다.
          </DialogDescription>
        </DialogHeader>
        {sent ? (
          <p className="text-sm text-blue-200">
            입력한 이메일로 가입된 아이디를 보냈습니다. 메일을 확인해 주세요.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className={inputBoxClass}>
              <Mail className="size-5 shrink-0 text-blue-300/90" strokeWidth={1.5} />
              <Input
                type="email"
                placeholder="가입 시 사용한 이메일"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={pending}
                className={inputFieldClass}
              />
            </div>
            {error && <p className="text-sm text-red-300">{error}</p>}
            <Button
              type="submit"
              disabled={pending}
              className="h-11 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
            >
              {pending ? "전송 중..." : "아이디 받기"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
