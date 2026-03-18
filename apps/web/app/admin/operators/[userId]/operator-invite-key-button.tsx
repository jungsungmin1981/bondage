"use client";

import { useEffect, useState } from "react";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Label } from "@workspace/ui/components/label";
import { Copy, Check } from "lucide-react";

/** 리거/버니 인증키: 24시간 (API와 동일) */
const AUTH_KEY_VALID_MS = 24 * 60 * 60 * 1000;

function formatRemaining(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m % 60)}:${pad(s % 60)}`;
}

function getSignupUrl(key: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/register?invite=${encodeURIComponent(key)}`;
}

function generateKey(): string {
  const chars = "0123456789abcdef";
  const bytes = new Uint8Array(12);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  }
  return Array.from(bytes, (b) => chars[b % 16]).join("");
}

export function OperatorInviteKeyButton() {
  const [open, setOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<"rigger" | "bunny" | null>(null);
  const [copiedKey, setCopiedKey] = useState<"rigger" | "bunny" | null>(null);
  const [now, setNow] = useState(Date.now);

  const [keyRigger, setKeyRigger] = useState<string | null>(null);
  const [expiresAtRigger, setExpiresAtRigger] = useState<number | null>(null);
  const [keyBunny, setKeyBunny] = useState<string | null>(null);
  const [expiresAtBunny, setExpiresAtBunny] = useState<number | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [keysLoaded, setKeysLoaded] = useState(false);

  function copyKey(key: string, type: "rigger" | "bunny") {
    navigator.clipboard.writeText(getSignupUrl(key)).then(
      () => {
        setCopiedKey(type);
        setTimeout(() => setCopiedKey(null), 2000);
      },
      () => {},
    );
  }

  async function generate(type: "rigger" | "bunny") {
    setGenerateError(null);
    const key = generateKey();
    const res = await fetch("/api/admin/invite-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, memberType: type }),
    });
    if (res.status === 409) {
      const j = await res.json().catch(() => ({}));
      setGenerateError(
        typeof j?.error === "string" ? j.error : "이미 유효한 인증키가 있습니다. 만료 후 다시 생성해 주세요.",
      );
      await fetchNonExpiredKeys();
      setGenerateError(null);
      return;
    }
    if (!res.ok) return;
    const expiresAt = Date.now() + AUTH_KEY_VALID_MS;
    if (type === "rigger") {
      setKeyRigger(key);
      setExpiresAtRigger(expiresAt);
      setSelectedForm("rigger");
    } else {
      setKeyBunny(key);
      setExpiresAtBunny(expiresAt);
      setSelectedForm("bunny");
    }
  }

  async function fetchNonExpiredKeys() {
    setKeysLoaded(false);
    const timeoutMs = 8000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch("/api/admin/invite-keys", {
        signal: controller.signal,
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.rigger) {
        setKeyRigger(data.rigger.key);
        setExpiresAtRigger(new Date(data.rigger.expiresAt).getTime());
      } else {
        setKeyRigger(null);
        setExpiresAtRigger(null);
      }
      if (data.bunny) {
        setKeyBunny(data.bunny.key);
        setExpiresAtBunny(new Date(data.bunny.expiresAt).getTime());
      } else {
        setKeyBunny(null);
        setExpiresAtBunny(null);
      }
    } catch {
      // 네트워크 오류·타임아웃 시 로딩만 해제
    } finally {
      clearTimeout(timeoutId);
      setKeysLoaded(true);
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      void fetchNonExpiredKeys();
    } else {
      setSelectedForm(null);
      setCopiedKey(null);
      setGenerateError(null);
      setKeysLoaded(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    const t = Date.now();
    if (keyRigger && expiresAtRigger != null && t < expiresAtRigger) {
      setSelectedForm("rigger");
      return;
    }
    if (keyBunny && expiresAtBunny != null && t < expiresAtBunny) {
      setSelectedForm("bunny");
      return;
    }
    setSelectedForm(null);
  }, [open, keyRigger, expiresAtRigger, keyBunny, expiresAtBunny]);

  useEffect(() => {
    if (!open || (!expiresAtRigger && !expiresAtBunny)) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (expiresAtRigger != null && t >= expiresAtRigger) {
        setKeyRigger(null);
        setExpiresAtRigger(null);
      }
      if (expiresAtBunny != null && t >= expiresAtBunny) {
        setKeyBunny(null);
        setExpiresAtBunny(null);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [open, expiresAtRigger, expiresAtBunny]);

  const remainingRigger =
    keyRigger && expiresAtRigger != null && now < expiresAtRigger
      ? Math.max(0, expiresAtRigger - now)
      : null;
  const remainingBunny =
    keyBunny && expiresAtBunny != null && now < expiresAtBunny
      ? Math.max(0, expiresAtBunny - now)
      : null;

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="shrink-0 min-w-[4.5rem] border-amber-500/70 text-amber-800 hover:bg-amber-50 hover:border-amber-600 hover:text-amber-900 dark:border-amber-500/60 dark:text-amber-400 dark:hover:bg-amber-950/40 dark:hover:text-amber-300"
        onClick={() => handleOpenChange(true)}
      >
        인증키
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/95">
          <DialogHeader className="items-center">
            <DialogTitle className="text-center text-primary font-semibold">
              인증키 생성
            </DialogTitle>
            <DialogDescription className="sr-only">
              복사한 링크를 전달하면 회원가입 페이지에서 인증키가 자동 입력됩니다.
            </DialogDescription>
            <p className="text-center text-xs text-muted-foreground">
              복사한 링크를 전달하면 회원가입 페이지에서 인증키가 자동 입력됩니다.
            </p>
            {generateError && (
              <p className="text-center text-xs font-medium text-destructive" role="alert">
                {generateError}
              </p>
            )}
          </DialogHeader>
          <div className="flex flex-col items-center space-y-6 pt-2">
            <div
              role="button"
              tabIndex={0}
              onClick={() => setSelectedForm("rigger")}
              onKeyDown={(e) =>
                (e.key === "Enter" || e.key === " ") && setSelectedForm("rigger")
              }
              className={`w-full max-w-[320px] cursor-pointer space-y-3 rounded-lg border p-4 transition-all duration-200 ${
                selectedForm === "rigger"
                  ? "border-primary bg-primary/15 ring-2 ring-primary/40 shadow-md scale-[1.02]"
                  : "border-border bg-muted/30 hover:bg-muted/50 hover:border-muted-foreground/30 hover:shadow-sm"
              }`}
            >
              {selectedForm !== "rigger" ? (
                <Label className="block text-center text-sm font-medium text-foreground">
                  리거
                </Label>
              ) : keyRigger && expiresAtRigger && remainingRigger !== null && remainingRigger > 0 ? (
                <div className="space-y-2">
                  <p className="text-center font-mono text-xs font-medium tabular-nums text-red-600 dark:text-red-400">
                    {formatRemaining(remainingRigger)}
                  </p>
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="font-mono text-sm text-foreground">
                      {keyRigger}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyKey(keyRigger, "rigger");
                      }}
                      aria-label="회원가입 링크 복사"
                    >
                      {copiedKey === "rigger" ? (
                        <Check className="size-4 text-green-600" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ) : keyRigger && expiresAtRigger ? (
                <p className="text-center text-xs font-medium text-destructive">
                  만료됨
                </p>
              ) : !keysLoaded ? (
                <p className="text-center text-xs text-muted-foreground">
                  불러오는 중…
                </p>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  className="w-full min-w-0 border-amber-500/70 bg-amber-500 text-amber-950 hover:bg-amber-600 dark:bg-amber-600 dark:text-amber-50 dark:hover:bg-amber-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    generate("rigger");
                  }}
                >
                  인증키 생성
                </Button>
              )}
            </div>
            <div
              role="button"
              tabIndex={0}
              onClick={() => setSelectedForm("bunny")}
              onKeyDown={(e) =>
                (e.key === "Enter" || e.key === " ") && setSelectedForm("bunny")
              }
              className={`w-full max-w-[320px] cursor-pointer space-y-3 rounded-lg border p-4 transition-all duration-200 ${
                selectedForm === "bunny"
                  ? "border-primary bg-primary/15 ring-2 ring-primary/40 shadow-md scale-[1.02]"
                  : "border-border bg-muted/30 hover:bg-muted/50 hover:border-muted-foreground/30 hover:shadow-sm"
              }`}
            >
              {selectedForm !== "bunny" ? (
                <Label className="block text-center text-sm font-medium text-foreground">
                  버니
                </Label>
              ) : keyBunny && expiresAtBunny && remainingBunny !== null && remainingBunny > 0 ? (
                <div className="space-y-2">
                  <p className="text-center font-mono text-xs font-medium tabular-nums text-red-600 dark:text-red-400">
                    {formatRemaining(remainingBunny)}
                  </p>
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="font-mono text-sm text-foreground">
                      {keyBunny}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyKey(keyBunny, "bunny");
                      }}
                      aria-label="회원가입 링크 복사"
                    >
                      {copiedKey === "bunny" ? (
                        <Check className="size-4 text-green-600" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ) : keyBunny && expiresAtBunny ? (
                <p className="text-center text-xs font-medium text-destructive">
                  만료됨
                </p>
              ) : !keysLoaded ? (
                <p className="text-center text-xs text-muted-foreground">
                  불러오는 중…
                </p>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  className="w-full min-w-0 border-amber-500/70 bg-amber-500 text-amber-950 hover:bg-amber-600 dark:bg-amber-600 dark:text-amber-50 dark:hover:bg-amber-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    generate("bunny");
                  }}
                >
                  인증키 생성
                </Button>
              )}
            </div>
          </div>
          <details className="mt-4 border-t border-border pt-3">
            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
              state 정보
            </summary>
            <pre className="mt-2 max-h-40 overflow-auto rounded bg-muted/50 p-2 text-[10px] font-mono text-muted-foreground">
              {JSON.stringify(
                {
                  keysLoaded,
                  keyRigger: keyRigger ? `${keyRigger.slice(0, 6)}…` : null,
                  expiresAtRigger: expiresAtRigger
                    ? new Date(expiresAtRigger).toISOString()
                    : null,
                  keyBunny: keyBunny ? `${keyBunny.slice(0, 6)}…` : null,
                  expiresAtBunny: expiresAtBunny
                    ? new Date(expiresAtBunny).toISOString()
                    : null,
                  selectedForm,
                  generateError: generateError ?? null,
                  now: new Date(now).toISOString(),
                },
                null,
                2,
              )}
            </pre>
          </details>
        </DialogContent>
      </Dialog>
    </>
  );
}
