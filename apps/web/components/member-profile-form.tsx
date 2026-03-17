"use client";

import { useCallback, useEffect, useActionState, useRef, useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  ACTIVITY_REGION_MAX_LENGTH,
  DIVISION_OPTIONS,
  GENDER_OPTIONS,
  styleArrayToString,
  styleStringToArray,
  STYLE_OPTIONS,
  YES_NO_OPTIONS,
} from "@/lib/rigger-profile-options";
import { cn } from "@workspace/ui/lib/utils";

/** 토글처럼 보이는 단일 선택 라디오 (구분/버니구인/본러팅용). 폼 제출 트리거 안 함 */
function SegmentedRadio({
  name,
  options,
  value,
  onChange,
  disabled,
  className,
  itemClassName,
}: {
  name: string;
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  className?: string;
  itemClassName?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={name}
      className={cn(
        "flex w-fit rounded-lg border border-input bg-transparent text-sm",
        className,
      )}
    >
      {options.map((opt, i) => (
        <label
          key={opt}
          className={cn(
            "flex flex-1 min-w-0 cursor-pointer items-center justify-center border-input px-3 py-1.5 text-xs sm:text-sm transition-colors first:rounded-l-[7px] last:rounded-r-[7px] only:rounded-lg",
            "hover:bg-accent hover:text-accent-foreground",
            "focus-within:z-10 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
            value === opt &&
              "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
            i > 0 && "border-l border-input",
            disabled && "pointer-events-none opacity-50",
            itemClassName,
          )}
        >
          <input
            type="radio"
            name={name}
            value={opt}
            checked={value === opt}
            onChange={() => onChange(opt)}
            disabled={disabled}
            className="sr-only"
          />
          <span>{opt}</span>
        </label>
      ))}
    </div>
  );
}

export type MemberProfileFormInitialValues = {
  nickname?: string;
  iconUrl?: string | null;
  bio?: string | null;
  gender?: string | null;
  division?: string | null;
  bunnyRecruit?: string | null;
  bondageRating?: string | null;
  activityRegion?: string | null;
  style?: string | null;
};

type MemberProfileFormProps = {
  memberType: "rigger" | "bunny";
  initialValues?: MemberProfileFormInitialValues;
  formAction: (prev: unknown, formData: FormData) => Promise<
    | { ok: true }
    | { ok: false; error: string; values?: MemberProfileFormInitialValues }
  >;
  submitLabel: string;
  /** 폼 id (외부 submit 버튼용 form="id" 연결) */
  formId?: string;
  /** true면 폼 내부 제출 버튼 숨김 (버튼을 카드 밖에 둘 때 사용) */
  hideSubmitButton?: boolean;
  /** 제출 전 확인 메시지. 있으면 확인 후에만 제출 (저장하고 승인 대기용) */
  confirmBeforeSubmitMessage?: string;
  /** 닉네임 입력 placeholder. 미지정 시 "한글로 부탁드립니다." */
  nicknamePlaceholder?: string;
};

export function MemberProfileForm({
  memberType,
  initialValues = {},
  formAction,
  submitLabel,
  formId,
  hideSubmitButton = false,
  confirmBeforeSubmitMessage,
  nicknamePlaceholder = "한글로 부탁드립니다.",
}: MemberProfileFormProps) {
  const [state, action, isPending] = useActionState(formAction, null);
  const error = state && !state.ok ? state.error : null;
  const isRigger = memberType === "rigger";

  const [nickname, setNickname] = useState(initialValues.nickname ?? "");
  type NicknameCheckStatus = "idle" | "checking" | "available" | "taken";
  const [nicknameCheckStatus, setNicknameCheckStatus] = useState<NicknameCheckStatus>("idle");
  const nicknameCheckAbortRef = useRef<AbortController | null>(null);
  const nicknameCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    fetch(url, { credentials: "include", signal: nicknameCheckAbortRef.current.signal })
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
    nicknameCheckTimeoutRef.current = setTimeout(() => checkNickname(nickname), 400);
    return () => {
      if (nicknameCheckTimeoutRef.current) clearTimeout(nicknameCheckTimeoutRef.current);
    };
  }, [nickname, checkNickname]);
  const [gender, setGender] = useState(
    initialValues.gender && GENDER_OPTIONS.includes(initialValues.gender as (typeof GENDER_OPTIONS)[number])
      ? initialValues.gender
      : "",
  );
  const [bio, setBio] = useState(initialValues.bio ?? "");
  const [activityRegion, setActivityRegion] = useState(
    initialValues.activityRegion ?? "",
  );
  /** 기본값: 구분 리거, 버니구인 No, 본러팅 No */
  const [division, setDivision] = useState(
    initialValues.division && DIVISION_OPTIONS.includes(initialValues.division as (typeof DIVISION_OPTIONS)[number])
      ? initialValues.division
      : "리거",
  );
  const [bunnyRecruit, setBunnyRecruit] = useState(
    initialValues.bunnyRecruit && YES_NO_OPTIONS.includes(initialValues.bunnyRecruit as (typeof YES_NO_OPTIONS)[number])
      ? initialValues.bunnyRecruit
      : "No",
  );
  const [bondageRating, setBondageRating] = useState(
    initialValues.bondageRating && YES_NO_OPTIONS.includes(initialValues.bondageRating as (typeof YES_NO_OPTIONS)[number])
      ? initialValues.bondageRating
      : "No",
  );
  const [styles, setStyles] = useState<string[]>(() =>
    styleStringToArray(initialValues.style),
  );
  const [activityRegionLength, setActivityRegionLength] = useState(
    (initialValues.activityRegion ?? "").length,
  );

  /** 검증 실패 시 서버에서 돌려준 values로 폼 복원 */
  useEffect(() => {
    if (!state || typeof state !== "object" || !("values" in state) || !state.values)
      return;
    const v = state.values;
    setNickname(v.nickname ?? "");
    setNicknameCheckStatus("idle");
    setGender(
      v.gender && GENDER_OPTIONS.includes(v.gender as (typeof GENDER_OPTIONS)[number])
        ? v.gender
        : "",
    );
    setBio(v.bio ?? "");
    setActivityRegion(v.activityRegion ?? "");
    setActivityRegionLength((v.activityRegion ?? "").length);
    setDivision(
      v.division && DIVISION_OPTIONS.includes(v.division as (typeof DIVISION_OPTIONS)[number])
        ? v.division
        : "리거",
    );
    setBunnyRecruit(
      v.bunnyRecruit && YES_NO_OPTIONS.includes(v.bunnyRecruit as (typeof YES_NO_OPTIONS)[number])
        ? v.bunnyRecruit
        : "No",
    );
    setBondageRating(
      v.bondageRating && YES_NO_OPTIONS.includes(v.bondageRating as (typeof YES_NO_OPTIONS)[number])
        ? v.bondageRating
        : "No",
    );
    setStyles(styleStringToArray(v.style));
  }, [state]);

  function toggleStyle(opt: string, checked: boolean) {
    setStyles((prev) =>
      checked ? [...new Set([...prev, opt])] : prev.filter((s) => s !== opt),
    );
  }

  /** 세그먼트 버튼 등이 실수로 폼을 제출하는 것 방지. submit 버튼이거나 submitter 없음(엔터 등)이면 허용 */
  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    if (submitter && submitter.getAttribute?.("type") !== "submit") {
      e.preventDefault();
      return;
    }
    // confirmBeforeSubmitMessage 있으면 제출 전 확인 (폼 밖 버튼 제출 시에도 동작)
    if (confirmBeforeSubmitMessage) {
      const confirmed = window.confirm(confirmBeforeSubmitMessage);
      if (!confirmed) e.preventDefault();
    }
  };

  return (
    <form
      action={action}
      className="space-y-5"
      id={formId}
      onSubmit={handleFormSubmit}
    >
      <input type="hidden" name="gender" value={gender} required title="성별을 선택해 주세요." />
      <input type="hidden" name="division" value={division} />
      <input type="hidden" name="bunnyRecruit" value={bunnyRecruit} />
      <input type="hidden" name="bondageRating" value={bondageRating} />
      <input type="hidden" name="style" value={styleArrayToString(styles)} />
      {isRigger && (
        <input
          type="hidden"
          name="styleRequired"
          value={styles.length > 0 ? "1" : ""}
          required
          title="스타일을 하나 이상 선택해 주세요."
        />
      )}
      <input
        type="hidden"
        name="iconUrl"
        value={
          state && "values" in state && state.values
            ? (state.values.iconUrl ?? initialValues.iconUrl ?? "")
            : (initialValues.iconUrl ?? "")
        }
      />

      {/* 한 줄에 한 항목씩 */}
      <dl className="grid grid-cols-[5rem_1fr] gap-x-3 gap-y-4 items-baseline">
        <dt className="shrink-0 text-sm font-medium text-muted-foreground">
          닉네임 <span className="text-destructive" aria-hidden>*</span>
        </dt>
        <dd className="min-w-0 space-y-1">
          <Input
            id="nickname"
            name="nickname"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder={nicknamePlaceholder}
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
        </dd>

        <dt className="shrink-0 text-sm font-medium text-muted-foreground">
          성별 <span className="text-destructive" aria-hidden>*</span>
        </dt>
        <dd className="min-w-0">
          <SegmentedRadio
            name="gender"
            options={[...GENDER_OPTIONS]}
            value={gender}
            onChange={setGender}
            disabled={isPending}
            className="w-full max-w-md"
            itemClassName="min-w-0 flex-1 px-2"
          />
        </dd>

        {isRigger && (
          <>
            <dt className="shrink-0 text-sm font-medium text-muted-foreground">
              구분
            </dt>
            <dd className="min-w-0">
              <SegmentedRadio
                name="division"
                options={DIVISION_OPTIONS}
                value={division}
                onChange={setDivision}
                disabled={isPending}
                className="w-full max-w-md"
                itemClassName="min-w-0 flex-1 px-2"
              />
            </dd>
            <dt className="shrink-0 text-sm font-medium text-muted-foreground">
              버니구인
            </dt>
            <dd className="min-w-0">
              <SegmentedRadio
                name="bunnyRecruit"
                options={YES_NO_OPTIONS}
                value={bunnyRecruit}
                onChange={setBunnyRecruit}
                disabled={isPending}
                className="w-full max-w-[200px]"
              />
            </dd>
            <dt className="shrink-0 text-sm font-medium text-muted-foreground">
              본러팅
            </dt>
            <dd className="min-w-0">
              <SegmentedRadio
                name="bondageRating"
                options={YES_NO_OPTIONS}
                value={bondageRating}
                onChange={setBondageRating}
                disabled={isPending}
                className="w-full max-w-[200px]"
              />
            </dd>
          </>
        )}

        <dt className="shrink-0 text-sm font-medium text-muted-foreground">
          활동지역 <span className="text-destructive" aria-hidden>*</span>
        </dt>
        <dd className="min-w-0">
          <div className="relative w-full max-w-md">
            <Input
              id="activityRegion"
              name="activityRegion"
              type="text"
              value={activityRegion}
              onChange={(e) => {
                const next = e.target.value.slice(0, ACTIVITY_REGION_MAX_LENGTH);
                setActivityRegion(next);
                setActivityRegionLength(next.length);
              }}
              required
              maxLength={ACTIVITY_REGION_MAX_LENGTH}
              placeholder="예: 서울·경기"
              disabled={isPending}
              className="w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap pr-[4.25rem]"
            />
            <span
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs tabular-nums text-muted-foreground"
              aria-hidden
            >
              {activityRegionLength}/{ACTIVITY_REGION_MAX_LENGTH}
            </span>
          </div>
        </dd>
        {isRigger && (
          <>
            <dt className="shrink-0 text-sm font-medium text-muted-foreground">
              스타일 <span className="text-destructive" aria-hidden>*</span>
            </dt>
            <dd className="min-w-0 flex flex-wrap gap-4">
              {STYLE_OPTIONS.map((opt) => (
                <label
                  key={opt}
                  className="flex cursor-pointer items-center gap-2 text-sm font-medium"
                >
                  <Checkbox
                    checked={styles.includes(opt)}
                    onCheckedChange={(c) => toggleStyle(opt, c === true)}
                    disabled={isPending}
                  />
                  {opt}
                </label>
              ))}
            </dd>
          </>
        )}
      </dl>

      <div className="border-t pt-4">
        <Label
          htmlFor="bio"
          className="text-sm font-medium text-muted-foreground"
        >
          자기소개 <span className="text-destructive" aria-hidden>*</span>
        </Label>
        <Textarea
          id="bio"
          name="bio"
          rows={4}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          required
          placeholder="자기소개를 입력하세요."
          disabled={isPending}
          className="mt-2 min-h-[120px] max-w-2xl"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!hideSubmitButton && (
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "저장 중…" : submitLabel}
          </Button>
        </div>
      )}
    </form>
  );
}
