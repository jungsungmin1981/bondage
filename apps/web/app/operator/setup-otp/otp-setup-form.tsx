"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@workspace/ui/components/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@workspace/ui/components/input-otp";
import { Label } from "@workspace/ui/components/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible";
import { ChevronDown, ExternalLink, Smartphone } from "lucide-react";

const GOOGLE_PLAY_URL =
  "https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2";
const APP_STORE_URL =
  "https://apps.apple.com/app/google-authenticator/id388497605";

export function OtpSetupForm() {
  const [step, setStep] = useState<"idle" | "qr" | "done">("idle");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/otp/status", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setEnabled(data.enabled === true);
      } else {
        setEnabled(false);
      }
    } catch {
      setEnabled(false);
    }
  }, []);

  const startSetup = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/otp/setup", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "QR 코드를 불러오지 못했습니다.");
        return;
      }
      setQrDataUrl(data.qrDataUrl ?? null);
      setSecret(data.secret ?? null);
      setStep("qr");
      setCode("");
    } finally {
      setLoading(false);
    }
  }, []);

  const confirmSetup = useCallback(async () => {
    if (!/^\d{6}$/.test(code)) {
      setError("6자리 숫자를 입력해 주세요.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/otp/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "등록에 실패했습니다.");
        return;
      }
      setStep("done");
      setEnabled(true);
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  if (enabled === null) {
    return (
      <p className="text-sm text-muted-foreground">확인 중…</p>
    );
  }

  if (enabled === true && step !== "qr") {
    return (
      <div className="space-y-4">
        <p className="rounded-lg bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
          이미 2단계 인증(OTP)이 설정되어 있습니다. 다음 로그인부터 앱에서 나오는
          6자리 코드를 입력하면 됩니다.
        </p>
        <p className="text-sm text-muted-foreground">
          OTP 설정 페이지 URL (관리자 확인용):{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
            /operator/setup-otp
          </code>
        </p>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="space-y-4">
        <p className="rounded-lg bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
          2단계 인증이 등록되었습니다. 다음 로그인부터 앱에서 나오는 6자리
          코드를 입력해 주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 1단계: 앱 설치 */}
      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-base font-medium text-foreground">
          <span className="flex size-6 items-center justify-center rounded-full bg-primary/20 text-xs text-primary">
            1
          </span>
          인증 앱 설치
        </h2>
        <p className="text-sm text-muted-foreground">
          휴대폰에 <strong>Google Authenticator</strong>(구글 OTP) 앱을
          설치해 주세요.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href={GOOGLE_PLAY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-2 text-sm font-medium transition hover:bg-muted"
          >
            <Smartphone className="size-4" />
            Google Play
            <ExternalLink className="size-3.5" />
          </a>
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-2 text-sm font-medium transition hover:bg-muted"
          >
            <Smartphone className="size-4" />
            App Store
            <ExternalLink className="size-3.5" />
          </a>
        </div>
        <p className="text-xs text-muted-foreground">
          Microsoft Authenticator, Authy 등 다른 인증 앱을 사용해도 됩니다.
        </p>
      </section>

      {/* 2단계: QR 스캔 */}
      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-base font-medium text-foreground">
          <span className="flex size-6 items-center justify-center rounded-full bg-primary/20 text-xs text-primary">
            2
          </span>
          QR 코드 스캔
        </h2>
        {step === "idle" ? (
          <>
            <p className="text-sm text-muted-foreground">
              아래 버튼을 누르면 QR 코드가 나타납니다. 인증 앱에서 &quot;계정
              추가&quot; 또는 &quot;QR 코드 스캔&quot;을 누른 뒤, 화면의 QR
              코드에 카메라를 맞춰 주세요.
            </p>
            <Button onClick={startSetup} disabled={loading}>
              {loading ? "불러오는 중…" : "QR 코드 불러오기"}
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              아래 QR 코드를 인증 앱으로 스캔해 주세요. 화면을 밝게 하거나,
              거리를 조절해 보세요.
            </p>
            {qrDataUrl && (
              <div className="flex justify-center rounded-lg border border-border bg-white p-4 dark:bg-muted/30">
                <img
                  src={qrDataUrl}
                  alt="OTP 등록용 QR 코드"
                  width={256}
                  height={256}
                  className="size-64 object-contain"
                />
              </div>
            )}
            {secret && (
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground underline hover:text-foreground">
                  QR이 안 되나요? 수동 입력 코드 보기
                  <ChevronDown className="size-4" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <p className="mt-2 break-all rounded bg-muted px-3 py-2 font-mono text-xs">
                    {secret}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    앱에서 &quot;수동 입력&quot; 또는 &quot;키 입력&quot;을
                    선택한 뒤 위 코드를 입력하세요.
                  </p>
                </CollapsibleContent>
              </Collapsible>
            )}
          </>
        )}
      </section>

      {/* 3단계: 6자리 입력 */}
      {step === "qr" && (
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-base font-medium text-foreground">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary/20 text-xs text-primary">
              3
            </span>
            6자리 코드 입력
          </h2>
          <p className="text-sm text-muted-foreground">
            앱에 표시되는 <strong>6자리 숫자</strong>를 아래 칸에 입력해
            주세요. 숫자는 30초마다 바뀌니, 최신 숫자를 입력해 주세요.
          </p>
          <div className="space-y-2">
            <Label htmlFor="otp-code">인증 코드</Label>
            <InputOTP
              id="otp-code"
              maxLength={6}
              value={code}
              onChange={(v) => setCode(v)}
              disabled={loading}
            >
              <InputOTPGroup className="gap-1">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
          <Button
            onClick={confirmSetup}
            disabled={loading || code.length !== 6}
          >
            {loading ? "확인 중…" : "등록하기"}
          </Button>
        </section>
      )}

      {error && (
        <p className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* FAQ */}
      <Collapsible>
        <CollapsibleTrigger className="flex w-full items-center justify-between text-left text-sm font-medium text-muted-foreground hover:text-foreground">
          자주 묻는 질문
          <ChevronDown className="size-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-4 text-sm text-muted-foreground">
          <div>
            <p className="font-medium text-foreground">
              앱을 잃어버리거나 삭제하면 어떻게 되나요?
            </p>
            <p className="mt-1">
              관리자에게 연락해 주시면 2단계 인증을 초기화해 드릴 수 있습니다.
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground">
              6자리를 입력했는데 &quot;일치하지 않습니다&quot;라고 나와요.
            </p>
            <p className="mt-1">
              앱에 표시된 숫자가 <strong>가장 최신</strong>인지 확인해 주세요.
              30초가 지나면 숫자가 바뀌므로, 새로 나온 6자리를 다시 입력해
              보세요.
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
