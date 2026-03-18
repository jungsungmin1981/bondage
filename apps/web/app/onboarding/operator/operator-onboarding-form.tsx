"use client";

import { useCallback, useEffect, useActionState, useRef, useState } from "react";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { submitOperatorProfile, type OperatorFormValues } from "../actions";

type OperatorOnboardingFormProps = {
  formAction: typeof submitOperatorProfile;
  formId: string;
};

type NicknameCheckStatus = "idle" | "checking" | "available" | "taken";

export function OperatorOnboardingForm({
  formAction,
  formId,
}: OperatorOnboardingFormProps) {
  const [state, action, isPending] = useActionState(formAction, null);
  const error = state && !state.ok ? state.error : null;
  const [nickname, setNickname] = useState("");
  const [nicknameCheckStatus, setNicknameCheckStatus] =
    useState<NicknameCheckStatus>("idle");
  const [bio, setBio] = useState("");
  const nicknameCheckAbortRef = useRef<AbortController | null>(null);
  const nicknameCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const checkNickname = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setNicknameCheckStatus("idle");
      return;
    }
    nicknameCheckAbortRef.current?.abort();
    nicknameCheckAbortRef.current = new AbortController();
    setNicknameCheckStatus("checking");
    const url = `/api/check-nickname?nickname=${encodeURIComponent(trimmed)}`;
    fetch(url, {
      credentials: "include",
      signal: nicknameCheckAbortRef.current.signal,
    })
      .then((res) => res.json())
      .then((data: { available?: boolean }) => {
        setNicknameCheckStatus(data.available ? "available" : "taken");
      })
      .catch(() => {
        setNicknameCheckStatus("idle");
      })
      .finally(() => {
        nicknameCheckAbortRef.current = null;
      });
  }, []);

  useEffect(() => {
    if (nicknameCheckTimeoutRef.current) clearTimeout(nicknameCheckTimeoutRef.current);
    const trimmed = nickname.trim();
    if (!trimmed) {
      setNicknameCheckStatus("idle");
      return;
    }
    nicknameCheckTimeoutRef.current = setTimeout(
      () => checkNickname(nickname),
      400,
    );
    return () => {
      if (nicknameCheckTimeoutRef.current) clearTimeout(nicknameCheckTimeoutRef.current);
    };
  }, [nickname, checkNickname]);

  useEffect(() => {
    if (!state || typeof state !== "object" || !("values" in state) || !state.values)
      return;
    const v = state.values as OperatorFormValues;
    setNickname(v.nickname ?? "");
    setNicknameCheckStatus("idle");
    setBio(v.bio ?? "");
  }, [state]);

  return (
    <form action={action} className="space-y-5" id={formId}>
      <div className="space-y-2">
        <Label htmlFor="operator-nickname" className="text-sm font-medium text-muted-foreground">
          닉네임 <span className="text-destructive" aria-hidden>*</span>
        </Label>
        <Input
          id="operator-nickname"
          name="nickname"
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="한글로 부탁드립니다."
          required
          maxLength={200}
          disabled={isPending}
          className="h-9 w-full max-w-md"
        />
        {nicknameCheckStatus === "checking" && (
          <p className="text-xs text-muted-foreground">확인 중…</p>
        )}
        {nicknameCheckStatus === "available" && (
          <p className="text-xs text-green-600 dark:text-green-500">사용 가능</p>
        )}
        {nicknameCheckStatus === "taken" && (
          <p className="text-xs text-destructive">이미 사용 중인 닉네임입니다.</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="operator-bio" className="text-sm font-medium text-muted-foreground">
          자기소개 <span className="text-destructive" aria-hidden>*</span>
        </Label>
        <Textarea
          id="operator-bio"
          name="bio"
          rows={4}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          required
          placeholder="자기소개를 입력하세요."
          disabled={isPending}
          className="min-h-[120px] max-w-2xl"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
