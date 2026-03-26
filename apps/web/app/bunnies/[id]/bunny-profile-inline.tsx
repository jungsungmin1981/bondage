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
  YES_NO_OPTIONS,
  STYLE_OPTIONS,
  styleArrayToString,
  styleStringToArray,
} from "@/lib/rigger-profile-options";
import { BioPreview } from "@/app/rigger/[id]/bio-preview";
import { saveBunnyProfile } from "./bunny-profile-actions";
import { Checkbox } from "@workspace/ui/components/checkbox";

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

export type BunnyProfileInlineProps = {
  profileId: string;
  statusLabel: string;
  name: string;
  gender: string | null | undefined;
  division: string | null | undefined;
  bondageRating: string | null | undefined;
  style: string | null | undefined;
  activityRegion: string | null | undefined;
  bio: string | null | undefined;
  profileVisibility?: "public" | "private" | null | undefined;
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
  bondageRating: initialBondage,
  style: initialStyle,
  activityRegion: initialRegion,
  bio: initialBio,
  profileVisibility: initialProfileVisibility,
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
  const [keysLoaded, setKeysLoaded] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

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

  const AUTH_KEY_VALID_MS = 24 * 60 * 60 * 1000; // 24시간 (API와 동일)

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

  async function fetchNonExpiredKeys() {
    setKeysLoaded(false);
    try {
      const res = await fetch("/api/invite-keys");
      if (!res.ok) return;
      const data = await res.json();
      if (data.rigger) {
        setGeneratedKeyRigger(data.rigger.key);
        setExpiresAtRigger(new Date(data.rigger.expiresAt).getTime());
      } else {
        setGeneratedKeyRigger(null);
        setExpiresAtRigger(null);
      }
      if (data.bunny) {
        setGeneratedKeyBunny(data.bunny.key);
        setExpiresAtBunny(new Date(data.bunny.expiresAt).getTime());
      } else {
        setGeneratedKeyBunny(null);
        setExpiresAtBunny(null);
      }
    } catch {
      // ignore
    } finally {
      setKeysLoaded(true);
    }
  }

  function handleAuthKeyModalOpenChange(open: boolean) {
    setAuthKeyModalOpen(open);
    if (open) {
      void fetchNonExpiredKeys();
    } else {
      setSelectedAuthKeyForm(null);
      setCopiedKey(null);
      setGenerateError(null);
      setKeysLoaded(false);
    }
  }

  async function handleGenerateAuthKey(type: "rigger" | "bunny") {
    setGenerateError(null);
    const key = generateAuthKey();
    try {
      const res = await fetch("/api/invite-keys", {
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
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) return;
        console.warn("invite-keys register failed", res.status);
        return;
      }
    } catch (e) {
      console.warn("invite-keys register error", e);
      return;
    }
    const expiresAt = Date.now() + AUTH_KEY_VALID_MS;
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
  const [bondageRating, setBondageRating] = useState(() =>
    normalizeYesNo(initialBondage),
  );
  const [styles, setStyles] = useState<string[]>(() =>
    styleStringToArray(initialStyle),
  );
  const [profileVisibility, setProfileVisibility] = useState<"public" | "private">(
    () => initialProfileVisibility === "private" ? "private" : "public",
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
      bondageRating: normalizeYesNo(initialBondage),
      stylesSorted: [...styleStringToArray(initialStyle)].sort().join("\0"),
      profileVisibility: initialProfileVisibility === "private" ? "private" : "public",
      activityRegion: (initialRegion?.trim() ?? "").slice(
        0,
        BUNNY_ACTIVITY_REGION_MAX_LENGTH,
      ),
      bio: (initialBio?.trim() ?? "").slice(0, BUNNY_BIO_MAX_LENGTH),
    }),
    [genderOption, initialDivision, initialBondage, initialStyle, initialProfileVisibility, initialRegion, initialBio],
  );

  const stylesSortedKey = useMemo(
    () => [...styles].sort().join("\0"),
    [styles],
  );

  const isDirty = useMemo(() => {
    if (gender !== baseline.gender) return true;
    if (division !== baseline.division) return true;
    if (bondageRating !== baseline.bondageRating) return true;
    if (stylesSortedKey !== baseline.stylesSorted) return true;
    if (profileVisibility !== baseline.profileVisibility) return true;
    if (activityRegion.trim() !== baseline.activityRegion) return true;
    if (bio.trim() !== baseline.bio) return true;
    return false;
  }, [gender, division, bondageRating, stylesSortedKey, profileVisibility, activityRegion, bio, baseline]);

  function resetToBaseline() {
    setGender(baseline.gender);
    setDivision(baseline.division);
    setBondageRating(baseline.bondageRating);
    setStyles(styleStringToArray(initialStyle));
    setProfileVisibility(baseline.profileVisibility === "private" ? "private" : "public");
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
  const styleDisplay =
    styles.length > 0 ? styles.join(", ") : initialStyle?.trim() || "-";

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
      bondageRating,
      style: styleArrayToString(styles) || null,
      profileVisibility,
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
    const row3 = [pair("본러팅", bondageRating), pair("활동지역", regionDisplay, true)];
    const row4 = [pair("스타일", styleDisplay)];
    const rawBio = bio || initialBio?.trim() || "-";

    return (
      <>
        <dl className="grid grid-cols-[auto_1fr] sm:grid-cols-[5rem_1fr_5rem_1fr] gap-x-3 gap-y-1.5 items-baseline">
          {[row1, row2, row3, row4].map((pairs, rowIndex) => (
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
                  onClick={() => handleAuthKeyModalOpenChange(true)}
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
                ) : generatedKeyRigger && expiresAtRigger && now < expiresAtRigger ? (
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
                ) : generatedKeyRigger && expiresAtRigger ? (
                  <p className="text-center text-xs font-medium text-destructive">만료됨</p>
                ) : !keysLoaded ? (
                  <p className="text-center text-xs text-muted-foreground">불러오는 중…</p>
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
                ) : generatedKeyBunny && expiresAtBunny && now < expiresAtBunny ? (
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
                ) : generatedKeyBunny && expiresAtBunny ? (
                  <p className="text-center text-xs font-medium text-destructive">만료됨</p>
                ) : !keysLoaded ? (
                  <p className="text-center text-xs text-muted-foreground">불러오는 중…</p>
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
      <div className="space-y-1.5">
        <dl className="grid grid-cols-[auto_1fr_auto_1fr] gap-x-4 gap-y-1.5 items-baseline">
          {[row1].map((pairs, rowIndex) => (
            <FragmentBlock key={rowIndex} pairs={pairs} />
          ))}
          <dt className="shrink-0 text-sm font-medium text-muted-foreground">성별</dt>
          <dd className="min-w-0 text-base font-medium">
            {gender?.trim() || initialGender?.trim() || "-"}
          </dd>
          <dt className="shrink-0 text-sm font-medium text-muted-foreground">구분</dt>
          <dd className="min-w-0 text-base font-medium">버니</dd>
        </dl>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 items-center">
          <dt className="shrink-0 text-sm font-medium text-muted-foreground">본러팅</dt>
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
                <ToggleGroupItem key={opt} value={opt} className="flex-1 px-3">
                  {opt}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </dd>
          <dt className="shrink-0 text-sm font-medium text-muted-foreground">활동지역</dt>
          <dd className="min-w-0">
            <div className="relative w-full max-w-md">
              <Input
                value={activityRegion}
                maxLength={BUNNY_ACTIVITY_REGION_MAX_LENGTH}
                onChange={(e) =>
                  setActivityRegion(e.target.value.slice(0, BUNNY_ACTIVITY_REGION_MAX_LENGTH))
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
          <dt className="self-start pt-1 shrink-0 text-sm font-medium text-muted-foreground">스타일</dt>
          <dd className="min-w-0 flex flex-wrap gap-4">
            {STYLE_OPTIONS.map((opt) => (
              <label key={opt} className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <Checkbox
                  checked={styles.includes(opt)}
                  onCheckedChange={(c) =>
                    setStyles((prev) =>
                      c === true ? [...new Set([...prev, opt])] : prev.filter((s) => s !== opt),
                    )
                  }
                />
                {opt}
              </label>
            ))}
          </dd>
          <dt className="shrink-0 text-sm font-medium text-muted-foreground">공개</dt>
          <dd className="min-w-0">
            <ToggleGroup
              type="single"
              value={profileVisibility}
              onValueChange={(v) => (v === "public" || v === "private") && setProfileVisibility(v)}
              variant="outline"
              size="sm"
              spacing={0}
              className="w-full max-w-[200px]"
            >
              <ToggleGroupItem value="public" className="flex-1 px-3">공개</ToggleGroupItem>
              <ToggleGroupItem value="private" className="flex-1 px-3">비공개</ToggleGroupItem>
            </ToggleGroup>
          </dd>
        </dl>
      </div>
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
