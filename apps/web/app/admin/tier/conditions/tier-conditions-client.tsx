"use client";

import { useState, useTransition } from "react";
import { updateConditionThresholdAction } from "../actions";
import type { TierConditionRow } from "@workspace/db";

const CONDITION_TYPE_LABEL: Record<string, string> = {
  first_post:       "공개 게시물 최초 등록",
  post_count:       "공개 게시물 수",
  total_likes:      "누적 좋아요",
  class_clear_rate: "초급 클래스 클리어율 (%)",
};

const CONDITION_TYPE_UNIT: Record<string, string> = {
  first_post:       "개 이상",
  post_count:       "개 이상",
  total_likes:      "개 이상",
  class_clear_rate: "% 이상",
};

/** 편집 불가 조건 (브론즈 first_post는 항상 1로 고정) */
function isFixed(cond: TierConditionRow) {
  return cond.conditionType === "first_post";
}

export function TierConditionsClient({
  conditions,
  tier,
  tierLabel,
}: {
  conditions: TierConditionRow[];
  tier: string;
  tierLabel: string;
}) {
  const [values, setValues] = useState<Record<string, number>>(
    Object.fromEntries(conditions.map((c) => [c.id, c.threshold])),
  );
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [, startTransition] = useTransition();

  function handleChange(id: string, value: string) {
    const num = parseInt(value, 10);
    if (!isNaN(num)) setValues((prev) => ({ ...prev, [id]: num }));
  }

  function handleSave(id: string) {
    setSaving((prev) => ({ ...prev, [id]: true }));
    setMessages((prev) => ({ ...prev, [id]: "" }));
    startTransition(async () => {
      const result = await updateConditionThresholdAction(id, values[id] ?? 0);
      setSaving((prev) => ({ ...prev, [id]: false }));
      setMessages((prev) => ({
        ...prev,
        [id]: result.ok ? "저장됨" : (result.error ?? "오류"),
      }));
    });
  }

  if (conditions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {tierLabel} 등급에 설정된 조건이 없습니다.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {conditions.map((cond) => (
        <div
          key={cond.id}
          className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-white">
                {cond.starIndex}
              </span>
              <span className="text-sm font-medium">
                {CONDITION_TYPE_LABEL[cond.conditionType] ?? cond.conditionType}
              </span>
            </div>
            <p className="mt-1 pl-8 text-xs text-muted-foreground">{cond.label}</p>
          </div>

          {isFixed(cond) ? (
            <div className="pl-8 text-sm text-muted-foreground sm:pl-0">
              게시물 1개 이상 등록 시 달성 (고정)
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={values[cond.id] ?? cond.threshold}
                onChange={(e) => handleChange(cond.id, e.target.value)}
                className="w-24 rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <span className="text-sm text-muted-foreground">
                {CONDITION_TYPE_UNIT[cond.conditionType] ?? ""}
              </span>
              <button
                type="button"
                disabled={saving[cond.id]}
                onClick={() => handleSave(cond.id)}
                className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
              >
                {saving[cond.id] ? "저장 중..." : "저장"}
              </button>
              {messages[cond.id] && (
                <span
                  className={`text-xs ${messages[cond.id] === "저장됨" ? "text-green-600" : "text-red-500"}`}
                >
                  {messages[cond.id]}
                </span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
