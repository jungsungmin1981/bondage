"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Copy, Check } from "lucide-react";

/** 리거/버니: 24시간, 운영자: 1시간 (API와 동일하게) */
const INVITE_KEY_VALID_MS_RIGGER_BUNNY = 24 * 60 * 60 * 1000;
const INVITE_KEY_VALID_MS_OPERATOR = 60 * 60 * 1000;

function getValidMs(memberType: MemberType): number {
  return memberType === "operator" ? INVITE_KEY_VALID_MS_OPERATOR : INVITE_KEY_VALID_MS_RIGGER_BUNNY;
}

function formatRemaining(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function generateKey(): string {
  const chars = "0123456789abcdef";
  const bytes = new Uint8Array(12);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  }
  return Array.from(bytes, (b) => chars[b % 16]).join("");
}

function getSignupUrl(key: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/register?invite=${encodeURIComponent(key)}`;
}

type MemberType = "rigger" | "bunny" | "operator";

function InviteKeySection({
  memberType,
  title,
  description,
  buttonClassName,
  initialKey = null,
  initialExpiresAt = null,
}: {
  memberType: MemberType;
  title: string;
  description: string;
  buttonClassName?: string;
  /** 서버에서 조회한 만료 전 키 (있으면 표시, 생성 버튼 숨김) */
  initialKey?: string | null;
  initialExpiresAt?: number | null;
}) {
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(Date.now);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialKey && initialExpiresAt != null) {
      setGeneratedKey(initialKey);
      setExpiresAt(initialExpiresAt);
    }
  }, [initialKey, initialExpiresAt]);

  /** 표시용: 생성한 키가 없어도 서버에서 받은 만료 전 키가 있으면 그걸로 표시 */
  const displayKey = generatedKey ?? initialKey ?? null;
  const displayExpiresAt = expiresAt ?? initialExpiresAt ?? null;
  const hasValidKey =
    displayKey != null && displayExpiresAt != null && now < displayExpiresAt;
  const remainingSeconds =
    displayExpiresAt != null && now < displayExpiresAt
      ? Math.max(0, Math.floor((displayExpiresAt - now) / 1000))
      : null;
  const expired = displayExpiresAt != null && now >= displayExpiresAt;

  const handleGenerate = useCallback(async () => {
    setError(null);
    const key = generateKey();
    const res = await fetch("/api/admin/invite-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, memberType }),
    });
    if (res.status === 409) {
      const j = await res.json().catch(() => ({}));
      setError(typeof j?.error === "string" ? j.error : "이미 유효한 인증키가 있습니다.");
      return;
    }
    if (!res.ok) return;
    setGeneratedKey(key);
    setExpiresAt(Date.now() + getValidMs(memberType));
  }, [memberType]);

  const handleCopy = useCallback(async () => {
    const keyToCopy = generatedKey ?? initialKey;
    if (!keyToCopy) return;
    try {
      await navigator.clipboard.writeText(getSignupUrl(keyToCopy));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }, [generatedKey, initialKey]);

  useEffect(() => {
    const until = displayExpiresAt ?? 0;
    if (until <= Date.now()) return;
    const t = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(t);
  }, [displayExpiresAt]);

  return (
    <section className="max-w-md space-y-4 rounded-lg border border-border bg-card p-4">
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground">{description}</p>
      {hasValidKey ? (
        <div className="space-y-2">
          <p className="font-mono text-xs font-medium tabular-nums text-muted-foreground">
            남은 시간 {formatRemaining(remainingSeconds!)}
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-muted px-2 py-1.5 font-mono text-sm">
              {displayKey}
            </code>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={handleCopy}
              aria-label="회원가입 링크 복사"
            >
              {copied ? (
                <Check className="size-4 text-green-600" />
              ) : (
                <Copy className="size-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            복사한 링크를 전달하면 회원가입 페이지에서 인증키가 자동 입력됩니다.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayKey && expired && (
            <p className="text-xs font-medium text-destructive">만료됨</p>
          )}
          <Button
            type="button"
            variant="default"
            onClick={handleGenerate}
            className={buttonClassName}
          >
            {memberType === "operator" && "운영자 인증키 생성"}
            {memberType === "rigger" && "리거 인증키 생성"}
            {memberType === "bunny" && "버니 인증키 생성"}
          </Button>
          {error && (
            <p className="text-xs font-medium text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

export function AdminInviteKeyForm({
  showOperatorKey = true,
}: {
  /** 주 관리자일 때만 true. false면 운영자 인증키 섹션 숨김 */
  showOperatorKey?: boolean;
}) {
  const [operatorKey, setOperatorKey] = useState<string | null>(null);
  const [operatorExpiresAt, setOperatorExpiresAt] = useState<number | null>(null);

  useEffect(() => {
    if (!showOperatorKey) return;
    fetch("/api/admin/invite-keys")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.operator?.key && data?.operator?.expiresAt) {
          setOperatorKey(data.operator.key);
          setOperatorExpiresAt(new Date(data.operator.expiresAt).getTime());
        }
      })
      .catch(() => {});
  }, [showOperatorKey]);

  if (!showOperatorKey) return null;
  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <InviteKeySection
        memberType="operator"
        title="운영자 전용 인증키"
        description="이 키로 가입한 계정은 운영진 권한을 갖습니다."
        buttonClassName="border-amber-500/70 bg-amber-500 text-amber-950 hover:bg-amber-600 dark:bg-amber-600 dark:text-amber-50 dark:hover:bg-amber-700"
        initialKey={operatorKey}
        initialExpiresAt={operatorExpiresAt}
      />
    </div>
  );
}
