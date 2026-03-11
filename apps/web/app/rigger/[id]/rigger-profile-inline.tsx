"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
  ACTIVITY_REGION_MAX_LENGTH,
  DIVISION_OPTIONS,
  styleArrayToString,
  styleStringToArray,
  STYLE_OPTIONS,
  YES_NO_OPTIONS,
} from "@/lib/rigger-profile-options";
import { BioPreview } from "./bio-preview";
import { dispatchProfileEditing } from "./profile-editing-events";
import { saveRiggerProfile } from "./rigger-profile-actions";

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
  name: string;
  gender: string | null | undefined;
  division: string | null | undefined;
  bunnyRecruit: string | null | undefined;
  bondageRating: string | null | undefined;
  activityRegion: string | null | undefined;
  style: string | null | undefined;
  bio: string | null | undefined;
};

export function RiggerProfileInline({
  riggerId,
  tierLabel,
  name,
  gender,
  division: initialDivision,
  bunnyRecruit: initialBunny,
  bondageRating: initialBondage,
  activityRegion: initialRegion,
  style: initialStyle,
  bio: initialBio,
}: RiggerProfileInlineProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

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
    }),
    [
      initialDivision,
      initialBunny,
      initialBondage,
      initialRegion,
      initialStyle,
      initialBio,
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
    return false;
  }, [
    division,
    bunnyRecruit,
    bondageRating,
    activityRegion,
    stylesSortedKey,
    bio,
    baseline,
  ]);

  function resetToBaseline() {
    setDivision(baseline.division);
    setBunnyRecruit(baseline.bunnyRecruit);
    setBondageRating(baseline.bondageRating);
    setActivityRegion(baseline.activityRegion);
    setStyles(styleStringToArray(initialStyle));
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

  if (!editing) {
    const row2 = [pair("성별", genderDisplay), pair("구분", division)];
    const row3 = [pair("버니구인", bunnyRecruit), pair("본러팅", bondageRating)];
    const row4 = [
      pair("활동지역", regionDisplay, true),
      pair("스타일", styleDisplay),
    ];
    const rawBio = bio || initialBio?.trim() || "-";

    return (
      <>
        <dl className="grid grid-cols-[5rem_1fr_5rem_1fr] gap-x-3 gap-y-1.5 items-baseline">
          {[row1, row2, row3, row4].map((pairs, rowIndex) => (
            <FragmentBlock key={rowIndex} pairs={pairs} />
          ))}
        </dl>
        <dl className="mt-4 grid grid-cols-[5rem_1fr] gap-x-3 gap-y-1.5 items-baseline border-t pt-4">
          <dt className="shrink-0 text-sm font-medium text-muted-foreground">
            자기소개
          </dt>
          <dd className="min-w-0">
            <Button
              type="button"
              size="sm"
              className="shrink-0"
              onClick={() => setEditing(true)}
            >
              정보수정
            </Button>
          </dd>
          <dd className="col-start-2 min-w-0">
            <BioPreview
              fullText={
                rawBio === "-" ? "-" : (bio || (initialBio?.trim() ?? ""))
              }
            />
          </dd>
        </dl>
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
        <dd className="min-w-0 text-lg font-medium">{genderDisplay}</dd>
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
  const isPendingTier =
    label === "등급" && value === PENDING_TIER_LABEL;
  return (
    <>
      <dt className="shrink-0 text-sm font-medium text-muted-foreground">
        {label}
      </dt>
      <dd
        className={
          ellipsis
            ? "min-w-0 overflow-hidden text-lg font-medium"
            : isPendingTier
              ? "min-w-0 text-lg font-medium text-blue-600"
              : "min-w-0 text-lg font-medium"
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
