"use client";

import { Fragment } from "react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@workspace/ui/components/button";
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
};

export function BunnyProfileInline({
  profileId,
  statusLabel,
  name,
  gender: initialGender,
  division: initialDivision,
  activityRegion: initialRegion,
  bio: initialBio,
}: BunnyProfileInlineProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
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
    return t.slice(0, ACTIVITY_REGION_MAX_LENGTH);
  });
  const [bio, setBio] = useState(() => initialBio?.trim() ?? "");

  const baseline = useMemo(
    () => ({
      gender: genderOption,
      division: normalizeDivision(initialDivision),
      activityRegion: (initialRegion?.trim() ?? "").slice(
        0,
        ACTIVITY_REGION_MAX_LENGTH,
      ),
      bio: initialBio?.trim() ?? "",
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
      ACTIVITY_REGION_MAX_LENGTH,
    );
    const res = await saveBunnyProfile(profileId, {
      activityRegion: regionTrimmed || null,
      bio: bio || null,
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
        <dd className="min-w-0 text-lg font-medium">
          {gender?.trim() || initialGender?.trim() || "-"}
        </dd>
        <dt className="shrink-0 text-sm font-medium text-muted-foreground">
          구분
        </dt>
        <dd className="min-w-0 text-lg font-medium">버니</dd>
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
      </dl>
      <div className="border-t pt-4">
        <Label htmlFor="bunny-bio" className="text-sm font-medium text-muted-foreground">
          자기소개
        </Label>
        <Textarea
          id="bunny-bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="mt-2 min-h-[120px] max-w-2xl"
          placeholder="자기소개를 입력하세요."
        />
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
            ? "min-w-0 overflow-hidden text-lg font-medium"
            : isPendingStatus
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
