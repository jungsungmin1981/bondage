"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
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
  ACTIVITY_REGION_MAX_LENGTH,
  DIVISION_OPTIONS,
  styleArrayToString,
  styleStringToArray,
  STYLE_OPTIONS,
  YES_NO_OPTIONS,
} from "@/lib/rigger-profile-options";
import type { ApprovedClassCountsByLevel } from "@workspace/db";
import type { PublicClassPostCountsByLevel } from "@workspace/db";
import { BioPreview } from "./bio-preview";
import { ClassSummaryBadges } from "./class-summary-badges";
import { dispatchProfileEditing } from "./profile-editing-events";
import {
  requestRiggerApprovalAgainAction,
  saveRiggerProfile,
} from "./rigger-profile-actions";

function normalizeYesNo(v: string | null | undefined): string {
  if (!v) return YES_NO_OPTIONS[0];
  const u = v.toUpperCase();
  if (u === "YES") return "Yes";
  if (u === "NO") return "No";
  return YES_NO_OPTIONS.includes(v as "Yes" | "No") ? v : YES_NO_OPTIONS[0];
}

function normalizeDivision(v: string | null | undefined): string {
  if (v && DIVISION_OPTIONS.includes(v as (typeof DIVISION_OPTIONS)[number]))
    return v;
  return DIVISION_OPTIONS[0];
}

export type RiggerProfileInlineProps = {
  riggerId: string;
  tierLabel: string;
  /** pending | approved | rejected. 반려 시 등급 칸에 '승인 요청' 버튼 표시 */
  approvalStatus?: "pending" | "approved" | "rejected";
  name: string;
  gender: string | null | undefined;
  division: string | null | undefined;
  bunnyRecruit: string | null | undefined;
  bondageRating: string | null | undefined;
  activityRegion: string | null | undefined;
  style: string | null | undefined;
  bio: string | null | undefined;
  /** 프로필 공개 여부 (공개/비공개) */
  profileVisibility?: "public" | "private" | null | undefined;
  /** 승인 완료한 클래스 건수 (레벨별) */
  classCounts?: ApprovedClassCountsByLevel;
  /** 레벨별 공개 클래스 전체 수 */
  totalByLevel?: PublicClassPostCountsByLevel;
  /** 가입 후 N시간 경과 시 true. 없으면 기본 true */
  canCreateInviteKey?: boolean;
  /** 인증키 생성 가능 시각 (ISO 문자열). 권한 없을 때 남은 시간 표시용 */
  inviteKeyAllowedAt?: string | null;
  /** 계정 사용 제한 중이면 인증키 버튼 숨김 */
  suspended?: boolean;
};

export function RiggerProfileInline({
  riggerId,
  tierLabel,
  approvalStatus,
  name,
  gender,
  division: initialDivision,
  bunnyRecruit: initialBunny,
  bondageRating: initialBondage,
  activityRegion: initialRegion,
  style: initialStyle,
  bio: initialBio,
  profileVisibility: initialProfileVisibility,
  classCounts,
  totalByLevel,
  canCreateInviteKey = true,
  inviteKeyAllowedAt: inviteKeyAllowedAtProp = null,
  suspended = false,
}: RiggerProfileInlineProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [profileVisibility, setProfileVisibility] = useState<"public" | "private">(
    () =>
      initialProfileVisibility === "private" ? "private" : "public",
  );
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
  const [requestApprovalLoading, setRequestApprovalLoading] = useState(false);

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

  /** 인증키 유효 시간 (밀리초). 5분 */
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

  /** 회원가입 페이지 URL (인증키 쿼리 포함). 복사 시 이 URL을 붙여넣으면 회원가입 폼에 인증키가 자동 입력됨 */
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
      // 인증키·만료시각은 유지해 두어서, 다시 열었을 때 남은 시간이 있으면 키 화면으로 바로 표시
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

  // 모달 열릴 때 유효한 인증키가 있으면 해당 키 화면으로 바로 표시, 만료된 키는 제거
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

  // 인증키 모달에서 남은 시간 1초마다 갱신, 만료 시 키 제거
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

  // 인증키 생성 가능까지 남은 시간 1초마다 갱신
  useEffect(() => {
    if (canCreateInviteKey || inviteKeyAllowedAtMs == null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [canCreateInviteKey, inviteKeyAllowedAtMs]);

  // 정보수정 진입/이탈 시 등급카드 마크 편집 허용 여부 동기화
  useEffect(() => {
    dispatchProfileEditing(editing);
    return () => dispatchProfileEditing(false);
  }, [editing]);
  const [saving, setSaving] = useState(false);
  const [division, setDivision] = useState(() =>
    normalizeDivision(initialDivision),
  );
  const [bunnyRecruit, setBunnyRecruit] = useState(() =>
    normalizeYesNo(initialBunny),
  );
  const [bondageRating, setBondageRating] = useState(() =>
    normalizeYesNo(initialBondage),
  );
  const [activityRegion, setActivityRegion] = useState(() => {
    const t = initialRegion?.trim() ?? "";
    return t.slice(0, ACTIVITY_REGION_MAX_LENGTH);
  });
  const [styles, setStyles] = useState<string[]>(() =>
    styleStringToArray(initialStyle),
  );
  const [bio, setBio] = useState(() => initialBio?.trim() ?? "");

  /** 편집 진입 시점 기준과 동일하게 정규화한 초기값 (dirty 비교용) */
  const baseline = useMemo(
    () => ({
      division: normalizeDivision(initialDivision),
      bunnyRecruit: normalizeYesNo(initialBunny),
      bondageRating: normalizeYesNo(initialBondage),
      activityRegion: (initialRegion?.trim() ?? "").slice(
        0,
        ACTIVITY_REGION_MAX_LENGTH,
      ),
      stylesSorted: [...styleStringToArray(initialStyle)].sort().join("\0"),
      bio: initialBio?.trim() ?? "",
      profileVisibility:
        initialProfileVisibility === "private" ? "private" : "public",
    }),
    [
      initialDivision,
      initialBunny,
      initialBondage,
      initialRegion,
      initialStyle,
      initialBio,
      initialProfileVisibility,
    ],
  );

  const stylesSortedKey = useMemo(
    () => [...styles].sort().join("\0"),
    [styles],
  );

  const isDirty = useMemo(() => {
    if (division !== baseline.division) return true;
    if (bunnyRecruit !== baseline.bunnyRecruit) return true;
    if (bondageRating !== baseline.bondageRating) return true;
    if (activityRegion.trim() !== baseline.activityRegion) return true;
    if (stylesSortedKey !== baseline.stylesSorted) return true;
    if (bio.trim() !== baseline.bio) return true;
    if (profileVisibility !== baseline.profileVisibility) return true;
    return false;
  }, [
    division,
    bunnyRecruit,
    bondageRating,
    activityRegion,
    stylesSortedKey,
    bio,
    profileVisibility,
    baseline,
  ]);

  function resetToBaseline() {
    setDivision(baseline.division);
    setBunnyRecruit(baseline.bunnyRecruit);
    setBondageRating(baseline.bondageRating);
    setActivityRegion(baseline.activityRegion);
    setStyles(styleStringToArray(initialStyle));
    setBio(baseline.bio);
    setProfileVisibility(baseline.profileVisibility);
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
  const row1 = [pair("닉네임", name || "-"), pair("등급", tierLabel)];
  const genderDisplay = gender?.trim() ? gender : "-";
  const styleDisplay =
    styles.length > 0 ? styles.join(", ") : initialStyle?.trim() || "-";
  const regionDisplay = activityRegion || initialRegion?.trim() || "-";

  async function handleSave() {
    setSaving(true);
    const regionTrimmed = activityRegion.trim().slice(
      0,
      ACTIVITY_REGION_MAX_LENGTH,
    );
    const res = await saveRiggerProfile(riggerId, {
      division,
      bunnyRecruit,
      bondageRating,
      activityRegion: regionTrimmed || null,
      style: styleArrayToString(styles) || null,
      bio: bio || null,
      profileVisibility,
    });
    setSaving(false);
    if (res.ok) {
      setEditing(false);
      router.refresh();
      // refresh 후 props가 갱신되면 baseline useMemo도 갱신됨
    } else {
      alert(res.error);
    }
  }

  function toggleStyle(option: string, checked: boolean) {
    setStyles((prev) =>
      checked
        ? [...new Set([...prev, option])]
        : prev.filter((s) => s !== option),
    );
  }

  async function handleRequestApprovalAgain() {
    setRequestApprovalLoading(true);
    try {
      const res = await requestRiggerApprovalAgainAction(riggerId);
      if (res.ok) router.refresh();
      else alert(res.error);
    } finally {
      setRequestApprovalLoading(false);
    }
  }

  if (!editing) {
    const row2 = [pair("성별", genderDisplay), pair("구분", division)];
    const row3 = [pair("버니구인", bunnyRecruit), pair("본러팅", bondageRating)];
    const row4 = [
      pair("활동지역", regionDisplay, true),
      pair("스타일", styleDisplay),
    ];
    const rawBio = bio || initialBio?.trim() || "-";
    const defaultCounts: ApprovedClassCountsByLevel = {
      beginner: 0,
      intermediate: 0,
      advanced: 0,
    };
    const defaultTotals: PublicClassPostCountsByLevel = {
      beginner: 0,
      intermediate: 0,
      advanced: 0,
    };

    return (
      <>
        <dl className="grid grid-cols-[5rem_1fr_5rem_1fr] gap-x-3 gap-y-1.5 items-baseline">
          {[row1, row2, row3, row4].map((pairs, rowIndex) => (
            <FragmentBlock
              key={rowIndex}
              pairs={pairs}
              approvalStatus={approvalStatus}
              riggerId={riggerId}
              onRequestApproval={handleRequestApprovalAgain}
              requestApprovalLoading={requestApprovalLoading}
            />
          ))}
          <Fragment>
            <dt className="shrink-0 text-sm font-medium text-muted-foreground">
              클래스
            </dt>
            <dd className="col-span-3 min-w-0">
              {classCounts && totalByLevel ? (
                <ClassSummaryBadges
                  classCounts={classCounts}
                  totalByLevel={totalByLevel}
                />
              ) : (
                <ClassSummaryBadges
                  classCounts={defaultCounts}
                  totalByLevel={defaultTotals}
                />
              )}
            </dd>
          </Fragment>
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
            {approvalStatus === "approved" && !suspended && (
              canCreateInviteKey ? (
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
              )
            )}
          </dd>
          <dd className="col-start-2 min-w-0">
            <BioPreview
              fullText={
                rawBio === "-" ? "-" : (bio || (initialBio?.trim() ?? ""))
              }
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
        <dd className="min-w-0 text-base font-medium">{genderDisplay}</dd>
        <dt className="shrink-0 text-sm font-medium text-muted-foreground">
          구분
        </dt>
        <dd className="min-w-0">
          <ToggleGroup
            type="single"
            value={division}
            onValueChange={(v) => v && setDivision(v)}
            variant="outline"
            size="sm"
            spacing={0}
            className="w-full max-w-md"
          >
            {DIVISION_OPTIONS.map((opt) => (
              <ToggleGroupItem
                key={opt}
                value={opt}
                className="min-w-0 flex-1 px-2 text-xs sm:text-sm"
              >
                {opt}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </dd>
        <dt className="shrink-0 text-sm font-medium text-muted-foreground">
          버니구인
        </dt>
        <dd className="min-w-0">
          <ToggleGroup
            type="single"
            value={bunnyRecruit}
            onValueChange={(v) => v && setBunnyRecruit(v)}
            variant="outline"
            size="sm"
            spacing={0}
            className="w-full max-w-[200px]"
          >
            {YES_NO_OPTIONS.map((opt) => (
              <ToggleGroupItem
                key={opt}
                value={opt}
                className="flex-1 px-3"
              >
                {opt}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </dd>
        <dt className="shrink-0 text-sm font-medium text-muted-foreground">
          본러팅
        </dt>
        <dd className="min-w-0">
          <ToggleGroup
            type="single"
            value={bondageRating}
            onValueChange={(v) => v && setBondageRating(v)}
            variant="outline"
            size="sm"
            spacing={0}
            className="w-full max-w-[200px]"
          >
            {YES_NO_OPTIONS.map((opt) => (
              <ToggleGroupItem
                key={opt}
                value={opt}
                className="flex-1 px-3"
              >
                {opt}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </dd>
        <dt className="col-span-4 mt-2 shrink-0 text-sm font-medium text-muted-foreground sm:col-span-1 sm:mt-0">
          활동지역
        </dt>
        <dd className="col-span-4 min-w-0 sm:col-span-3">
          <div className="relative w-full max-w-md">
            <Input
              value={activityRegion}
              maxLength={ACTIVITY_REGION_MAX_LENGTH}
              onChange={(e) =>
                setActivityRegion(
                  e.target.value.slice(0, ACTIVITY_REGION_MAX_LENGTH),
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
              {activityRegion.length}/{ACTIVITY_REGION_MAX_LENGTH}
            </span>
          </div>
        </dd>
        <dt className="col-span-4 mt-2 shrink-0 text-sm font-medium text-muted-foreground sm:col-span-1 sm:mt-0">
          스타일
        </dt>
        <dd className="col-span-4 flex min-w-0 flex-wrap gap-4 sm:col-span-3">
          {STYLE_OPTIONS.map((opt) => (
            <label
              key={opt}
              className="flex cursor-pointer items-center gap-2 text-sm font-medium"
            >
              <Checkbox
                checked={styles.includes(opt)}
                onCheckedChange={(c) => toggleStyle(opt, c === true)}
              />
              {opt}
            </label>
          ))}
        </dd>
        <dt className="col-span-4 mt-2 shrink-0 text-sm font-medium text-muted-foreground sm:col-span-1 sm:mt-0">
          공개
        </dt>
        <dd className="col-span-4 flex min-w-0 flex-wrap items-center gap-2 sm:col-span-3">
          <ToggleGroup
            type="single"
            value={profileVisibility}
            onValueChange={(v) => v && setProfileVisibility(v)}
            variant="outline"
            size="sm"
            spacing={0}
            className="w-full max-w-[200px]"
          >
            <ToggleGroupItem value="public" className="flex-1 px-3">
              공개
            </ToggleGroupItem>
            <ToggleGroupItem value="private" className="flex-1 px-3">
              비공개
            </ToggleGroupItem>
          </ToggleGroup>
          <Button asChild size="sm" variant="outline">
            <Link
              href={`/change-password?callbackURL=${encodeURIComponent(`/rigger/${riggerId}`)}`}
            >
              비밀번호 변경
            </Link>
          </Button>
        </dd>
      </dl>
      <div className="border-t pt-4">
        <Label htmlFor="bio" className="text-sm font-medium text-muted-foreground">
          자기소개
        </Label>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="mt-2 min-h-[120px] max-w-2xl"
          placeholder="자기소개를 입력하세요."
        />
      </div>
      {/* 변경이 있을 때만 저장/취소 노출; 없으면 상세로만 */}
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

function FragmentBlock({
  pairs,
  approvalStatus,
  riggerId,
  onRequestApproval,
  requestApprovalLoading,
}: {
  pairs: PairItem[];
  approvalStatus?: "pending" | "approved" | "rejected";
  riggerId?: string;
  onRequestApproval?: () => void | Promise<void>;
  requestApprovalLoading?: boolean;
}) {
  return (
    <>
      {pairs.map(({ label, value, ellipsis }) => (
        <FragmentRow
          key={label}
          label={label}
          value={value}
          ellipsis={ellipsis}
          approvalStatus={approvalStatus}
          riggerId={riggerId}
          onRequestApproval={onRequestApproval}
          requestApprovalLoading={requestApprovalLoading}
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
  approvalStatus,
  riggerId,
  onRequestApproval,
  requestApprovalLoading,
}: {
  label: string;
  value: string;
  ellipsis?: boolean;
  approvalStatus?: "pending" | "approved" | "rejected";
  riggerId?: string;
  onRequestApproval?: () => void | Promise<void>;
  requestApprovalLoading?: boolean;
}) {
  const display = value || "-";
  const isPendingTier =
    label === "등급" && value === PENDING_TIER_LABEL;
  const isRejectedTier =
    label === "등급" && approvalStatus === "rejected" && riggerId && onRequestApproval;
  return (
    <>
      <dt className="shrink-0 text-sm font-medium text-muted-foreground">
        {label}
      </dt>
      <dd
        className={
          ellipsis
            ? "min-w-0 overflow-hidden text-base font-medium"
            : isPendingTier
              ? "min-w-0 text-base font-medium text-blue-600"
              : "min-w-0 text-base font-medium"
        }
        title={ellipsis && display !== "-" ? display : undefined}
      >
        {isRejectedTier ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-blue-600 border-blue-600/50 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:border-blue-400/50 dark:hover:bg-blue-950/40 dark:hover:text-blue-300"
            onClick={() => void onRequestApproval?.()}
            disabled={requestApprovalLoading}
          >
            {requestApprovalLoading ? "처리 중…" : "승인 요청"}
          </Button>
        ) : ellipsis ? (
          <span className="block truncate">{display}</span>
        ) : (
          display
        )}
      </dd>
    </>
  );
}
