"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  searchMembersByNicknameAction,
  applySuspensionAction,
  liftSuspensionAction,
  getMemberCardForRestrictionAction,
  type MemberSearchItem,
  type MemberCardForRestriction,
} from "./actions";
import { BunnyCard } from "@/components/bunny-card";
import { RiggerTierCard } from "@/components/rigger-tier-card";

const SEARCH_DEBOUNCE_MS = 350;

const DURATION_OPTIONS: { label: string; value: number | null }[] = [
  { label: "1일", value: 1 },
  { label: "3일", value: 3 },
  { label: "5일", value: 5 },
  { label: "10일", value: 10 },
  { label: "15일", value: 15 },
  { label: "30일", value: 30 },
  { label: "영구정지", value: null },
];

/** 서버에서 전달되는 목록 아이템 (날짜는 직렬화되어 string으로 올 수 있음) */
export type InitialSuspensionListItem = {
  id: string;
  profileId: string;
  userId: string;
  nickname: string;
  memberType: string;
  suspendedUntil: Date | string | null;
  reason: string | null;
  createdAt: Date | string;
};

function formatSuspendedUntil(d: Date | string | null): string {
  if (d == null) return "영구";
  const t = new Date(d);
  return t.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCreatedAt(d: Date | string): string {
  return new Date(d).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type RestrictionsFormProps = {
  initialSuspensionList?: InitialSuspensionListItem[];
};

export function RestrictionsForm({ initialSuspensionList = [] }: RestrictionsFormProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [items, setItems] = useState<MemberSearchItem[]>([]);
  const [selected, setSelected] = useState<MemberSearchItem | null>(null);
  const [cardData, setCardData] = useState<MemberCardForRestriction | null>(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [durationDays, setDurationDays] = useState<number | null>(30);
  const [reason, setReason] = useState("");
  const [applying, setApplying] = useState(false);
  const [lifting, setLifting] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setItems([]);
      setSelected(null);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      setItems([]);
      setSelected(null);
      try {
        const result = await searchMembersByNicknameAction(q);
        if (result.ok) setItems(result.items);
        else alert(result.error);
      } finally {
        setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  async function handleSearch() {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setItems([]);
    setSelected(null);
    try {
      const result = await searchMembersByNicknameAction(q);
      if (result.ok) setItems(result.items);
      else alert(result.error);
    } finally {
      setSearching(false);
    }
  }

  useEffect(() => {
    if (!selected) {
      setCardData(null);
      setCardLoading(false);
      return;
    }
    let cancelled = false;
    setCardLoading(true);
    setCardData(null);
    getMemberCardForRestrictionAction(selected.id, selected.memberType)
      .then((result) => {
        if (cancelled) return;
        if (result.ok) setCardData(result.card);
        else setCardData(null);
      })
      .finally(() => {
        if (!cancelled) setCardLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected?.id, selected?.memberType]);

  async function handleApply() {
    if (!selected) {
      alert("회원을 선택해 주세요.");
      return;
    }
    setApplying(true);
    try {
      const result = await applySuspensionAction(
        selected.userId,
        durationDays,
        reason.trim() || undefined,
      );
      if (result.ok) {
        alert("이용제한이 적용되었습니다.");
        setSelected(null);
        setReason("");
        router.refresh();
      } else {
        alert(result.error);
      }
    } finally {
      setApplying(false);
    }
  }

  async function handleLift() {
    if (!selected) {
      alert("회원을 선택해 주세요.");
      return;
    }
    setLifting(true);
    try {
      const result = await liftSuspensionAction(selected.userId);
      if (result.ok) {
        alert("정지가 해제되었습니다.");
        setSelected(null);
        setReason("");
        router.refresh();
      } else {
        alert(result.error);
      }
    } finally {
      setLifting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <Label htmlFor="restrictions-search" className="text-sm font-medium">
          닉네임 검색
        </Label>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Input
            id="restrictions-search"
            type="text"
            placeholder="닉네임 입력 시 자동 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="max-w-xs"
          />
          {searching && (
            <span className="text-xs text-muted-foreground">검색 중…</span>
          )}
        </div>
      </section>

      {items.length > 0 && (
        <section>
          <p className="mb-4 text-sm text-muted-foreground">
            검색 결과 {items.length}명
            {items.length > 10 ? " (최대 10명 표시)" : ""}
          </p>
          <ul className="flex flex-col gap-0 border-t border-border">
            {items.slice(0, 10).map((item) => {
              const isRigger = item.memberType === "rigger";
              const isSelected = selected?.userId === item.userId;
              return (
                <li key={item.userId} className="border-b border-border">
                  <button
                    type="button"
                    onClick={() => setSelected(item)}
                    className={`flex min-h-[56px] w-full flex-col justify-center gap-0.5 px-2 py-3 text-left transition-colors hover:bg-muted/40 active:bg-muted/60 ${
                      isSelected ? "bg-primary/10" : ""
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                          isRigger
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                            : "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300"
                        }`}
                      >
                        {isRigger ? "리거" : "버니"}
                      </span>
                      <span className="line-clamp-2 min-w-0 flex-1 text-[15px] font-medium text-foreground">
                        {item.nickname}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {selected && (
        <div className="flex flex-col gap-4 md:flex-row md:items-stretch">
          <section className="shrink-0 rounded-lg border bg-card p-4 md:w-[280px] md:max-w-[280px]">
            {cardLoading ? (
              <div className="flex min-h-[280px] items-center justify-center text-sm text-muted-foreground md:aspect-[3/4]">
                회원 카드 불러오는 중…
              </div>
            ) : cardData ? (
              <>
                {cardData.memberType === "rigger" ? (
                  <RiggerTierCard
                    rigger={cardData.rigger}
                    jailOverlayUrl={
                      cardData.suspended ? "/jail-card.png" : undefined
                    }
                  />
                ) : (
                  <BunnyCard
                    cardImageUrl={cardData.cardImageUrl}
                    jailOverlay={cardData.suspended}
                  />
                )}
              </>
            ) : null}
          </section>
          <section className="flex min-w-0 flex-1 flex-col justify-between gap-4 rounded-lg border bg-card p-4 md:min-h-0">
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">이용제한</h3>
              <Button
                type="button"
                variant="outline"
                onClick={handleLift}
                disabled={applying || lifting}
                className="shrink-0 border-emerald-500/60 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 hover:text-emerald-800 dark:border-emerald-400/50 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25"
              >
                {lifting ? "해제 중…" : "정지해지"}
              </Button>
            </div>
            <div className="shrink-0">
              <Label htmlFor="restrictions-duration" className="text-sm font-medium">
                정지 기간
              </Label>
              <select
                id="restrictions-duration"
                value={durationDays === null ? "permanent" : durationDays}
                onChange={(e) => {
                  const v = e.target.value;
                  setDurationDays(v === "permanent" ? null : Number(v));
                }}
                className="mt-1.5 block w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {DURATION_OPTIONS.map((opt) => (
                  <option
                    key={opt.label}
                    value={opt.value === null ? "permanent" : opt.value}
                  >
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex min-h-0 flex-1 flex-col">
              <Label htmlFor="restrictions-reason" className="shrink-0 text-sm font-medium">
                사유 (선택, 100자)
              </Label>
              <Textarea
                id="restrictions-reason"
                placeholder="이용제한 사유"
                value={reason}
                onChange={(e) => setReason(e.target.value.slice(0, 100))}
                maxLength={100}
                rows={4}
                className="mt-1.5 h-[6.5rem] w-full resize-none overflow-y-auto"
              />
              <p className="mt-1 text-right text-xs text-muted-foreground">
                {reason.length}/100
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              onClick={handleApply}
              disabled={applying || lifting}
              className="shrink-0"
            >
              {applying ? "적용 중…" : "이용제한 적용"}
            </Button>
          </section>
        </div>
      )}

      <section className="mt-10">
        <h2 className="text-sm font-semibold text-foreground">이용제한 적용 목록</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          현재 유효한 정지 {initialSuspensionList.length}건 · 클릭 시 회원 카드와 이용제한 폼이 위에 표시됩니다.
        </p>
        {initialSuspensionList.length === 0 ? (
          <p className="mt-4 rounded-lg border border-border bg-card py-8 text-center text-sm text-muted-foreground">
            적용 중인 이용제한이 없습니다.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-0 border-t border-border">
            {initialSuspensionList.map((item) => {
              const isSelected = selected?.userId === item.userId;
              return (
                <li key={item.id} className="border-b border-border">
                  <button
                    type="button"
                    onClick={() => {
                      setSelected({
                        id: item.profileId,
                        userId: item.userId,
                        nickname: item.nickname,
                        memberType: item.memberType,
                      });
                      setReason((item.reason?.trim() ?? "").slice(0, 100));
                    }}
                    className={`flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-2 py-3 text-left text-sm transition-colors hover:bg-muted/40 active:bg-muted/60 ${
                      isSelected ? "bg-primary/10" : ""
                    }`}
                  >
                    <span className="font-medium text-foreground">{item.nickname}</span>
                    <span
                      className={
                        item.memberType === "rigger"
                          ? "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                          : "rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800 dark:bg-sky-950/50 dark:text-sky-300"
                      }
                    >
                      {item.memberType === "rigger" ? "리거" : "버니"}
                    </span>
                    <span className="text-muted-foreground">
                      해제일: {formatSuspendedUntil(item.suspendedUntil)}
                    </span>
                    {item.reason?.trim() ? (
                      <span className="w-full text-muted-foreground sm:w-auto">
                        사유: {item.reason.trim()}
                      </span>
                    ) : null}
                    <span className="ml-auto text-xs text-muted-foreground">
                      적용: {formatCreatedAt(item.createdAt)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
