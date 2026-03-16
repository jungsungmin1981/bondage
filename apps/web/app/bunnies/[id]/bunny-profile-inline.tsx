"use client";

import { Fragment, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  BUNNY_ACTIVITY_REGION_MAX_LENGTH,
  BUNNY_BIO_MAX_LENGTH,
  DIVISION_OPTIONS,
  GENDER_OPTIONS,
} from "@/lib/rigger-profile-options";
import { BioPreview } from "@/app/rigger/[id]/bio-preview";
import { saveBunnyProfile } from "./bunny-profile-actions";

function normalizeDivision(v: string | null | undefined): string {
  if (v && DIVISION_OPTIONS.includes(v as (typeof DIVISION_OPTIONS)[number]))
    return v;
  return DIVISION_OPTIONS[0];
}

export type BunnyProfileInlineProps = {
  profileId: string;
  statusLabel: string;
  name: string;
  gender: string | null | undefined;
  division: string | null | undefined;
  activityRegion: string | null | undefined;
  bio: string | null | undefined;
  /** true면 처음부터 편집 모드로 열림 (예: /bunnies/[id]/edit) */
  defaultEditing?: boolean;
  /** 가입 후 N시간 경과 시 true. 없으면 기본 true */
  canCreateInviteKey?: boolean;
  /** 인증키 생성 가능 시각 (ISO 문자열). 권한 없을 때 남은 시간 표시용 */
  inviteKeyAllowedAt?: string | null;
  /** 승인된 본인 프로필일 때만 인증키 버튼 노출 */
  showInviteKeyButton?: boolean;
};

export function BunnyProfileInline({
  profileId,
  statusLabel,
  name,
  gender: initialGender,
  division: initialDivision,
  activityRegion: initialRegion,
  bio: initialBio,
  defaultEditing = false,
  canCreateInviteKey = true,
  inviteKeyAllowedAt: inviteKeyAllowedAtProp = null,
  showInviteKeyButton = false,
}: BunnyProfileInlineProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(!!defaultEditing);
  const [saving, setSaving] = useState(false);
  const [authKeyModalOpen, setAuthKeyModalOpen] = useState(false);
  const [selectedAuthKeyForm, setSelectedAuthKeyForm] = useState<
    "rigger" | "bunny" | null
  >(null);
  const [generatedKeyRigger, setGeneratedKeyRigger] = useState<string | null>(
    null,
  );
  const [generatedKeyBunny, setGeneratedKeyBunny] = useState<string | null>(
    null,
  );
  const [expiresAtRigger, setExpiresAtRigger] = useState<number | null>(null);
  const [expiresAtBunny, setExpiresAtBunny] = useState<number | null>(null);
  const [copiedKey, setCopiedKey] = useState<"rigger" | "bunny" | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const inviteKeyAllowedAtMs =
    inviteKeyAllowedAtProp != null
      ? new Date(inviteKeyAllowedAtProp).getTime()
      : null;
  const remainingSecondsUntilInviteKey =
    inviteKeyAllowedAtMs != null && !canCreateInviteKey
      ? Math.max(
          0,
          Math.floor((inviteKeyAllowedAtMs - Date.now()) / 1000),
        )
      : null;

  const AUTH_KEY_VALID_MS = 5 * 60 * 1000;

  function formatRemaining(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }

  function formatRemainingInviteKey(seconds: number): string {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const parts: string[] = [];
    if (d > 0) parts.push(`${d}일`);
    if (h > 0) parts.push(`${h}시간`);
    if (m > 0) parts.push(`${m}분`);
    parts.push(`${s}초`);
    return parts.join(" ");
  }

  function getSignupUrl(key: string): string {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/register?invite=${encodeURIComponent(key)}`;
  }

  async function copyAuthKey(key: string, type: "rigger" | "bunny") {
    try {
      await navigator.clipboard.writeText(getSignupUrl(key));
      setCopiedKey(type);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // ignore
    }
  }

  function generateAuthKey(): string {
    const chars = "0123456789abcdef";
    const bytes = new Uint8Array(12);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      crypto.getRandomValues(bytes);
    }
    return Array.from(bytes, (b) => chars[b % 16]).join("");
  }

  function handleAuthKeyModalOpenChange(open: boolean) {
    setAuthKeyModalOpen(open);
    if (!open) {
      setSelectedAuthKeyForm(null);
      setCopiedKey(null);
    }
  }

  async function handleGenerateAuthKey(type: "rigger" | "bunny") {
    const key = generateAuthKey();
    const expiresAt = Date.now() + AUTH_KEY_VALID_MS;
    try {
      const res = await fetch("/api/invite-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, memberType: type }),
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) return;
        console.warn("invite-keys register failed", res.status);
      }
    } catch (e) {
      console.warn("invite-keys register error", e);
    }
    if (type === "rigger") {
      setGeneratedKeyRigger(key);
      setExpiresAtRigger(expiresAt);
    } else {
      setGeneratedKeyBunny(key);
      setExpiresAtBunny(expiresAt);
    }
  }

  useEffect(() => {
    if (!authKeyModalOpen) return;
    const t = Date.now();
    if (
      generatedKeyRigger &&
      expiresAtRigger != null &&
      t < expiresAtRigger
    ) {
      setSelectedAuthKeyForm("rigger");
      return;
    }
    if (expiresAtRigger != null && t >= expiresAtRigger) {
      setGeneratedKeyRigger(null);
      setExpiresAtRigger(null);
    }
    if (
      generatedKeyBunny &&
      expiresAtBunny != null &&
      t < expiresAtBunny
    ) {
      setSelectedAuthKeyForm("bunny");
      return;
    }
    if (expiresAtBunny != null && t >= expiresAtBunny) {
      setGeneratedKeyBunny(null);
      setExpiresAtBunny(null);
    }
    setSelectedAuthKeyForm(null);
  }, [authKeyModalOpen]);

  useEffect(() => {
    if (!authKeyModalOpen || (!expiresAtRigger && !expiresAtBunny)) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (expiresAtRigger != null && t >= expiresAtRigger) {
        setGeneratedKeyRigger(null);
        setExpiresAtRigger(null);
      }
      if (expiresAtBunny != null && t >= expiresAtBunny) {
        setGeneratedKeyBunny(null);
        setExpiresAtBunny(null);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [authKeyModalOpen, expiresAtRigger, expiresAtBunny]);

  useEffect(() => {
    if (canCreateInviteKey || inviteKeyAllowedAtMs == null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [canCreateInviteKey, inviteKeyAllowedAtMs]);
  const genderOption =
    initialGender && GENDER_OPTIONS.includes(initialGender as (typeof GENDER_OPTIONS)[number])
      ? initialGender
      : "";
  const [gender, setGender] = useState(genderOption);
  const [division, setDivision] = useState(() =>
    normalizeDivision(initialDivision),
  );
  const [activityRegion, setActivityRegion] = useState(() => {
    const t = initialRegion?.trim() ?? "";
    return t.slice(0, BUNNY_ACTIVITY_REGION_MAX_LENGTH);
  });
  const [bio, setBio] = useState(() => {
    const t = initialBio?.trim() ?? "";
    return t.slice(0, BUNNY_BIO_MAX_LENGTH);
  });

  const baseline = useMemo(
    () => ({
      gender: genderOption,
      division: normalizeDivision(initialDivision),
      activityRegion: (initialRegion?.trim() ?? "").slice(
        0,
        BUNNY_ACTIVITY_REGION_MAX_LENGTH,
      ),
      bio: (initialBio?.trim() ?? "").slice(0, BUNNY_BIO_MAX_LENGTH),
    }),
    [genderOption, initialDivision, initialRegion, initialBio],
  );

  const isDirty = useMemo(() => {
    if (gender !== baseline.gender) return true;
    if (division !== baseline.division) return true;
    if (activityRegion.trim() !== baseline.activityRegion) return true;
    if (bio.trim() !== baseline.bio) return true;
    return false;
  }, [gender, division, activityRegion, bio, baseline]);

  function resetToBaseline() {
    setGender(baseline.gender);
    setDivision(baseline.division);
    setActivityRegion(baseline.activityRegion);
    setBio(baseline.bio);
  }

  function exitToDetail() {
    setEditing(false);
    resetToBaseline();
  }

  const pair = (label: string, value: string, ellipsis?: boolean) => ({
    label,
    value,
    ellipsis,
  });
  const row1 = [pair("닉네임", name || "-"), pair("상태", statusLabel)];
  const regionDisplay = activityRegion || initialRegion?.trim() || "-";

  async function handleSave() {
    setSaving(true);
    const regionTrimmed = activityRegion.trim().slice(
      0,
      BUNNY_ACTIVITY_REGION_MAX_LENGTH,
    );
    const bioTrimmed = (bio || "").trim().slice(0, BUNNY_BIO_MAX_LENGTH);
    const res = await saveBunnyProfile(profileId, {
      activityRegion: regionTrimmed || null,
      bio: bioTrimmed || null,
    });
    setSaving(false);
    if (res.ok) {
      setEditing(false);
      router.refresh();
    } else {
      alert(res.error);
    }
  }

  if (!editing) {
    const genderDisplay = gender?.trim() || initialGender?.trim() || "-";
    const row2 = [pair("성별", genderDisplay), pair("구분", "버니")];
    const row3 = [pair("활동지역", regionDisplay, true)];
    const rawBio = bio || initialBio?.trim() || "-";

    return (
      <>
        <dl className="grid grid-cols-[5rem_1fr_5rem_1fr] gap-x-3 gap-y-1.5 items-baseline">
          {[row1, row2, row3].map((pairs, rowIndex) => (
            <FragmentBlock key={rowIndex} pairs={pairs} />
          ))}
        </dl>
        <dl className="mt-4 grid grid-cols-[5rem_1fr] gap-x-3 gap-y-1.5 items-baseline border-t pt-4">
          <dt className="shrink-0 text-sm font-medium text-muted-foreground">
            자기소개
          </dt>
          <dd className="min-w-0 flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              size="sm"
              className="shrink-0 min-w-[4.5rem]"
              onClick={() => setEditing(true)}
            >
              정보수정
            </Button>
            {showInviteKeyButton &&
              (canCreateInviteKey ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="shrink-0 min-w-[4.5rem] border-amber-500/70 text-amber-800 hover:bg-amber-50 hover:border-amber-600 hover:text-amber-900 dark:border-amber-500/60 dark:text-amber-400 dark:hover:bg-amber-950/40 dark:hover:text-amber-300"
                  onClick={() => setAuthKeyModalOpen(true)}
                >
                  인증키
                </Button>
              ) : (
                <span className="flex shrink-0 min-w-0 flex-wrap items-center gap-2">
                  {remainingSecondsUntilInviteKey != null &&
                    remainingSecondsUntilInviteKey > 0 && (
                      <span className="font-mono text-xs font-medium tabular-nums text-muted-foreground">
                        {formatRemainingInviteKey(remainingSecondsUntilInviteKey)}
                      </span>
                    )}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="min-w-[4.5rem] border-amber-500/70 text-amber-800 opacity-70 dark:border-amber-500/60 dark:text-amber-400"
                    disabled
                  >
                    인증키
                  </Button>
                </span>
              ))}
          </dd>
          <dd className="col-start-2 min-w-0">
            <BioPreview
              fullText={
                rawBio === "-" ? "-" : (bio || (initialBio?.trim() ?? ""))
              }
              previewMaxHeightRem={11}
            />
          </dd>
        </dl>
        <Dialog open={authKeyModalOpen} onOpenChange={handleAuthKeyModalOpenChange}>
          <DialogContent className="sm:max-w-md bg-slate-50 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700">
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
            </DialogHeader>
            <div className="flex flex-col items-center space-y-6 pt-2">
              <div
                role="button"
                tabIndex={0}
                onClick={() => setSelectedAuthKeyForm("rigger")}
                onKeyDown={(e) =>
                  (e.key === "Enter" || e.key === " ") &&
                  setSelectedAuthKeyForm("rigger")
                }
                className={`w-full max-w-[320px] cursor-pointer space-y-3 rounded-lg border p-4 transition-all duration-200 ${
                  selectedAuthKeyForm === "rigger"
                    ? "border-primary bg-primary/15 ring-2 ring-primary/40 shadow-md scale-[1.02]"
                    : "border-border bg-muted/30 hover:bg-muted/50 hover:border-muted-foreground/30 hover:shadow-sm"
                }`}
              >
                {selectedAuthKeyForm !== "rigger" ? (
                  <Label className="block text-center text-sm font-medium text-foreground">
                    리거
                  </Label>
                ) : generatedKeyRigger && expiresAtRigger ? (
                  (() => {
                    const remainingSeconds = Math.max(
                      0,
                      Math.floor((expiresAtRigger - now) / 1000),
                    );
                    return (
                      <div className="space-y-2">
                        <p className="text-center font-mono text-xs font-medium tracking-widest tabular-nums text-red-600 [text-shadow:0_0_6px_currentColor] dark:text-red-400">
                          {remainingSeconds > 0
                            ? formatRemaining(remainingSeconds)
                            : "만료됨"}
                        </p>
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="font-mono text-sm text-foreground">
                            {generatedKeyRigger}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="h-6 w-6 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyAuthKey(generatedKeyRigger, "rigger");
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
                    );
                  })()
                ) : (
                  <div className="w-full">
                    <Button
                      type="button"
                      size="sm"
                      className="w-full min-w-0 border-amber-500/70 bg-amber-500 text-amber-950 hover:bg-amber-600 dark:bg-amber-600 dark:text-amber-50 dark:hover:bg-amber-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGenerateAuthKey("rigger");
                      }}
                    >
                      인증키 생성
                    </Button>
                  </div>
                )}
              </div>
              <div
                role="button"
                tabIndex={0}
                onClick={() => setSelectedAuthKeyForm("bunny")}
                onKeyDown={(e) =>
                  (e.key === "Enter" || e.key === " ") &&
                  setSelectedAuthKeyForm("bunny")
                }
                className={`w-full max-w-[320px] cursor-pointer space-y-3 rounded-lg border p-4 transition-all duration-200 ${
                  selectedAuthKeyForm === "bunny"
                    ? "border-primary bg-primary/15 ring-2 ring-primary/40 shadow-md scale-[1.02]"
                    : "border-border bg-muted/30 hover:bg-muted/50 hover:border-muted-foreground/30 hover:shadow-sm"
                }`}
              >
                {selectedAuthKeyForm !== "bunny" ? (
                  <Label className="block text-center text-sm font-medium text-foreground">
                    버니
                  </Label>
                ) : generatedKeyBunny && expiresAtBunny ? (
                  (() => {
                    const remainingSeconds = Math.max(
                      0,
                      Math.floor((expiresAtBunny - now) / 1000),
                    );
                    return (
                      <div className="space-y-2">
                        <p className="text-center font-mono text-xs font-medium tracking-widest tabular-nums text-red-600 [text-shadow:0_0_6px_currentColor] dark:text-red-400">
                          {remainingSeconds > 0
                            ? formatRemaining(remainingSeconds)
                            : "만료됨"}
                        </p>
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="font-mono text-sm text-foreground">
                            {generatedKeyBunny}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="h-6 w-6 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyAuthKey(generatedKeyBunny, "bunny");
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
                    );
                  })()
                ) : (
                  <div className="w-full">
                    <Button
                      type="button"
                      size="sm"
                      className="w-full min-w-0 border-amber-500/70 bg-amber-500 text-amber-950 hover:bg-amber-600 dark:bg-amber-600 dark:text-amber-50 dark:hover:bg-amber-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGenerateAuthKey("bunny");
                      }}
                    >
                      인증키 생성
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-[5rem_1fr_5rem_1fr] gap-x-3 gap-y-1.5 items-baseline">
        {[row1].map((pairs, rowIndex) => (
          <FragmentBlock key={rowIndex} pairs={pairs} />
        ))}
        <dt className="shrink-0 text-sm font-medium text-muted-foreground">
          성별
        </dt>
        <dd className="min-w-0 text-base font-medium">
          {gender?.trim() || initialGender?.trim() || "-"}
        </dd>
        <dt className="shrink-0 text-sm font-medium text-muted-foreground">
          구분
        </dt>
        <dd className="min-w-0 text-base font-medium">버니</dd>
        <dt className="col-span-4 mt-2 shrink-0 text-sm font-medium text-muted-foreground sm:col-span-1 sm:mt-0">
          활동지역
        </dt>
        <dd className="col-span-4 min-w-0 sm:col-span-3">
          <div className="relative w-full max-w-md">
            <Input
              value={activityRegion}
              maxLength={BUNNY_ACTIVITY_REGION_MAX_LENGTH}
              onChange={(e) =>
                setActivityRegion(
                  e.target.value.slice(0, BUNNY_ACTIVITY_REGION_MAX_LENGTH),
                )
              }
              placeholder="예: 서울·경기"
              className="w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap pr-[4.25rem]"
              title={activityRegion || undefined}
            />
            <span
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs tabular-nums text-muted-foreground"
              aria-hidden
            >
              {activityRegion.length}/{BUNNY_ACTIVITY_REGION_MAX_LENGTH}
            </span>
          </div>
        </dd>
      </dl>
      <div className="border-t pt-4">
        <Label htmlFor="bunny-bio" className="text-sm font-medium text-muted-foreground">
          자기소개
        </Label>
        <div className="relative mt-2 max-w-2xl">
          <Textarea
            id="bunny-bio"
            value={bio}
            maxLength={BUNNY_BIO_MAX_LENGTH}
            onChange={(e) =>
              setBio(e.target.value.slice(0, BUNNY_BIO_MAX_LENGTH))
            }
            className="min-h-[120px] w-full pb-8"
            placeholder="자기소개를 입력하세요."
          />
          <span
            className="pointer-events-none absolute bottom-2 right-2 text-xs tabular-nums text-muted-foreground"
            aria-hidden
          >
            {bio.length}/{BUNNY_BIO_MAX_LENGTH}
          </span>
        </div>
      </div>
      {isDirty ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="default"
            className="min-w-[9rem] px-8 bg-blue-600 font-medium text-white shadow-sm hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "저장 중…" : "저장"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={exitToDetail}
            disabled={saving}
          >
            취소
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={exitToDetail}
            disabled={saving}
          >
            취소
          </Button>
        </div>
      )}
    </div>
  );
}

type PairItem = { label: string; value: string; ellipsis?: boolean };

function FragmentBlock({ pairs }: { pairs: PairItem[] }) {
  return (
    <>
      {pairs.map(({ label, value, ellipsis }) => (
        <FragmentRow
          key={label}
          label={label}
          value={value}
          ellipsis={ellipsis}
        />
      ))}
    </>
  );
}

const PENDING_TIER_LABEL = "승인 대기중";

function FragmentRow({
  label,
  value,
  ellipsis,
}: {
  label: string;
  value: string;
  ellipsis?: boolean;
}) {
  const display = value || "-";
  const isPendingStatus =
    label === "상태" && value === PENDING_TIER_LABEL;
  return (
    <>
      <dt className="shrink-0 text-sm font-medium text-muted-foreground">
        {label}
      </dt>
      <dd
        className={
          ellipsis
            ? "min-w-0 overflow-hidden text-base font-medium"
            : isPendingStatus
              ? "min-w-0 text-base font-medium text-blue-600"
              : "min-w-0 text-base font-medium"
        }
        title={ellipsis && display !== "-" ? display : undefined}
      >
        {ellipsis ? (
          <span className="block truncate">{display}</span>
        ) : (
          display
        )}
      </dd>
    </>
  );
}
