"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, User, UserPlus, KeyRound } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";

const inputBoxClass =
  "flex items-center gap-3 rounded-xl border border-blue-400/20 bg-blue-900/40 px-4 py-3 focus-within:border-blue-400/50 focus-within:ring-2 focus-within:ring-blue-400/20";
const inputFieldClass =
  "min-h-0 flex-1 border-0 bg-transparent p-0 text-blue-100 placeholder:text-blue-300/70 focus-visible:ring-0 focus-visible:ring-offset-0";

/** 에러 객체에서 읽을 수 있는 메시지 문자열 추출 */
function extractErrorMessage(err: unknown): string {
  if (err == null) return "";
  if (typeof err === "string") return err.trim();
  if (typeof err === "object") {
    const o = err as Record<string, unknown>;
    if (typeof o.message === "string") return o.message.trim();
    if (typeof o.error === "string") return o.error.trim();
    if (typeof o.msg === "string") return o.msg.trim();
    if (o.body != null) {
      const bodyMsg = extractErrorMessage(o.body);
      if (bodyMsg) return bodyMsg;
    }
    if (o.data && typeof o.data === "object" && typeof (o.data as Record<string, unknown>).message === "string")
      return String((o.data as Record<string, unknown>).message).trim();
    if (o.cause != null) return extractErrorMessage(o.cause);
  }
  return "";
}

/** 회원가입 실패 시 서버 메시지를 한글로 변환. 매칭 안 되면 원인 메시지를 붙여서 반환 */
function getSignupErrorMessage(message: unknown): string {
  const text = (
    typeof message === "string" ? message : extractErrorMessage(message)
  ).trim();
  const lower = (text === "[object Object]" ? "" : text).toLowerCase();
  if (lower.includes("already exists") || lower.includes("use another email"))
    return "이미 가입된 이메일입니다. 다른 이메일을 사용해 주세요.";
  if (lower.includes("username") && (lower.includes("taken") || lower.includes("already")))
    return "이미 사용 중인 아이디입니다.";
  if (lower.includes("email already") || lower.includes("email is already"))
    return "이미 사용 중인 이메일입니다.";
  if (lower.includes("invalid email"))
    return "올바른 이메일 형식이 아닙니다.";
  if (lower.includes("password") && (lower.includes("short") || lower.includes("length")))
    return "비밀번호는 8자 이상이어야 합니다.";
  if (lower.includes("username") && lower.includes("invalid"))
    return "아이디는 영문, 숫자만 사용할 수 있습니다.";
  if (lower.includes("invite_key_expired"))
    return "인증키가 만료되었습니다.";
  if (lower.includes("invite_key_already_used"))
    return "이미 사용된 인증키입니다.";
  if (lower.includes("invite_key_invalid"))
    return "유효하지 않은 인증키입니다. 인증키를 확인해 주세요.";
  if (lower.includes("invite_key_required"))
    return "회원가입 인증키를 입력해 주세요.";
  const display = text === "[object Object]" ? "" : text;
  if (display) return `회원가입에 실패했습니다. (${display})`;
  return "회원가입에 실패했습니다. 입력 내용을 확인해 주세요.";
}

const ID_PATTERN = /^[a-zA-Z0-9]*$/;
function isValidId(value: string): boolean {
  return ID_PATTERN.test(value);
}

export function SignupForm({ className, ...props }: React.ComponentProps<"div">) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [inviteKey, setInviteKey] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // /register?invite=xxx 진입 시 회원가입 인증키 필드에 자동 입력
  useEffect(() => {
    const invite = searchParams.get("invite") ?? searchParams.get("key") ?? "";
    if (invite.trim()) setInviteKey(invite.trim());
  }, [searchParams]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const trimmedId = username.trim();
    if (!isValidId(trimmedId)) {
      setError("아이디는 영문, 숫자만 사용할 수 있습니다.");
      return;
    }
    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    const key = inviteKey.trim();
    if (!key) {
      setError("회원가입 인증키를 입력해 주세요.");
      return;
    }
    setPending(true);

    const { error: signUpError } = await authClient.signUp.email(
      {
        email,
        password,
        name: trimmedId || email,
        username: trimmedId,
        callbackURL: "/login",
        inviteKey: key,
      } as unknown as Parameters<typeof authClient.signUp.email>[0],
      {
        onError: (ctx) => {
          setError(getSignupErrorMessage(ctx.error));
        },
      },
    );

    setPending(false);
    if (signUpError) {
      setError((prev) => prev ?? getSignupErrorMessage(signUpError));
    } else {
      router.push("/login?emailVerificationSent=1");
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
      <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
        <div className="flex size-16 items-center justify-center rounded-full border-2 border-blue-400 bg-blue-500/30 shadow-lg backdrop-blur">
          <UserPlus className="size-8 text-blue-300" strokeWidth={1.5} />
        </div>
      </div>

      <div className="pt-6">
        <form onSubmit={onSubmit} className="flex flex-col gap-6">
          <div className={inputBoxClass}>
            <KeyRound className="size-5 shrink-0 text-blue-300/90" strokeWidth={1.5} />
            <Input
              id="inviteKey"
              type="text"
              autoComplete="off"
              placeholder="회원가입 인증키"
              value={inviteKey}
              onChange={(e) => setInviteKey(e.target.value)}
              disabled={pending}
              className={inputFieldClass}
            />
          </div>
          <div className={inputBoxClass}>
            <User className="size-5 shrink-0 text-blue-300/90" strokeWidth={1.5} />
            <Input
              id="username"
              type="text"
              autoComplete="username"
              placeholder="아이디 (영문, 숫자)"
              required
              value={username}
              onChange={(e) => {
                const v = e.target.value.replace(/[^a-zA-Z0-9]/g, "");
                setUsername(v);
              }}
              disabled={pending}
              className={inputFieldClass}
            />
          </div>
          <div className={inputBoxClass}>
            <Mail className="size-5 shrink-0 text-blue-300/90" strokeWidth={1.5} />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="이메일"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={pending}
              className={inputFieldClass}
            />
          </div>
          <div className={inputBoxClass}>
            <Lock className="size-5 shrink-0 text-blue-300/90" strokeWidth={1.5} />
            <Input
              id="password"
              type="password"
              placeholder="Password (8+ characters)"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={pending}
              className={inputFieldClass}
            />
          </div>
          <div className={inputBoxClass}>
            <Lock className="size-5 shrink-0 text-blue-300/90" strokeWidth={1.5} />
            <Input
              id="confirm-password"
              type="password"
              placeholder="Confirm password"
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
            {pending ? "가입 중..." : "회원가입"}
          </Button>
          <Link
            href="/login"
            className="flex h-12 w-full items-center justify-center rounded-xl border border-blue-400/30 bg-blue-500/10 text-base font-medium uppercase tracking-wide text-blue-100 shadow-sm transition hover:bg-blue-500/20 hover:text-blue-50 min-h-[44px]"
          >
            로그인
          </Link>
        </form>
      </div>
    </div>
  );
}
