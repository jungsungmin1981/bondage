"use client";

import { useState, useTransition } from "react";
import { recalculateAllStarsAction, updateRiggerTierAction } from "../actions";
import type { RiggerTierRow } from "@workspace/db";

const TIERS = ["bronze", "silver", "gold", "legend"] as const;
const TIER_LABEL: Record<string, string> = {
  bronze: "브론즈",
  silver: "실버",
  gold: "골드",
  legend: "레전드",
};
const TIER_COLOR: Record<string, string> = {
  bronze: "text-amber-600",
  silver: "text-slate-400",
  gold: "text-yellow-400",
  legend: "text-purple-500",
};

function StarDisplay({ count, max = 5 }: { count: number; max?: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={i < count ? "text-amber-400" : "text-muted-foreground/30"}>
          ★
        </span>
      ))}
    </span>
  );
}

export function RiggerTierListClient({ riggers }: { riggers: RiggerTierRow[] }) {
  const [rows, setRows] = useState(riggers);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ tier: string; stars: number }>({
    tier: "bronze",
    stars: 0,
  });
  const [saving, setSaving] = useState(false);
  const [recalcMsg, setRecalcMsg] = useState("");
  const [, startTransition] = useTransition();

  function openEdit(r: RiggerTierRow) {
    setEditing(r.profileId);
    setEditValues({ tier: r.tier, stars: r.stars });
  }

  function handleSave(profileId: string) {
    setSaving(true);
    startTransition(async () => {
      const result = await updateRiggerTierAction(
        profileId,
        editValues.tier,
        editValues.stars,
      );
      setSaving(false);
      if (result.ok) {
        setRows((prev) =>
          prev.map((r) =>
            r.profileId === profileId
              ? { ...r, tier: editValues.tier, stars: editValues.stars }
              : r,
          ),
        );
        setEditing(null);
      }
    });
  }

  function handleRecalcAll() {
    setRecalcMsg("재계산 중...");
    startTransition(async () => {
      const result = await recalculateAllStarsAction();
      setRecalcMsg(result.ok ? `완료 (${result.count}명 업데이트)` : (result.error ?? "오류"));
    });
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={handleRecalcAll}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          전체 별 재계산
        </button>
        {recalcMsg && (
          <span className="text-sm text-muted-foreground">{recalcMsg}</span>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">닉네임</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">등급</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">별</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">관리</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.profileId} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium">{r.nickname}</td>
                <td className="px-4 py-3">
                  {editing === r.profileId ? (
                    <select
                      value={editValues.tier}
                      onChange={(e) =>
                        setEditValues((v) => ({ ...v, tier: e.target.value }))
                      }
                      className="rounded-md border border-border bg-background px-2 py-1 text-sm"
                    >
                      {TIERS.map((t) => (
                        <option key={t} value={t}>
                          {TIER_LABEL[t]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className={`font-semibold ${TIER_COLOR[r.tier] ?? ""}`}>
                      {TIER_LABEL[r.tier] ?? r.tier}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {editing === r.profileId ? (
                    <select
                      value={editValues.stars}
                      onChange={(e) =>
                        setEditValues((v) => ({
                          ...v,
                          stars: parseInt(e.target.value, 10),
                        }))
                      }
                      className="rounded-md border border-border bg-background px-2 py-1 text-sm"
                    >
                      {[0, 1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n}개
                        </option>
                      ))}
                    </select>
                  ) : (
                    <StarDisplay count={r.stars} />
                  )}
                </td>
                <td className="px-4 py-3">
                  {editing === r.profileId ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleSave(r.profileId)}
                        className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                      >
                        저장
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(null)}
                        className="rounded-md border border-border px-3 py-1 text-xs font-medium hover:bg-muted"
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openEdit(r)}
                      className="rounded-md border border-border px-3 py-1 text-xs font-medium hover:bg-muted"
                    >
                      수정
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  승인된 리거가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
