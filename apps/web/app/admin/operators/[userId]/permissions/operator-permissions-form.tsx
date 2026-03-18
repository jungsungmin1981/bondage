"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { saveOperatorPermissionsAction } from "./actions";
import { ADMIN_TAB_SUB_OPTIONS } from "@/lib/admin-operator-permissions";

export function OperatorPermissionsForm({
  targetUserId,
  initialTabIds,
}: {
  targetUserId: string;
  initialTabIds: string[];
}) {
  const router = useRouter();
  const initialSet = useMemo(() => new Set(initialTabIds), [initialTabIds]);

  const [tabState, setTabState] = useState(() =>
    ADMIN_TAB_SUB_OPTIONS.map((opt) => {
      const full = initialSet.has(opt.tabId);
      const subIds = new Set(
        opt.subTabs.filter((sub) => initialSet.has(`${opt.tabId}:${sub.id}`)).map((s) => s.id),
      );
      if (full) {
        opt.subTabs.forEach((sub) => subIds.add(sub.id));
      }
      return { tabId: opt.tabId, full, subIds };
    }),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setTab = (index: number, update: Partial<{ full: boolean; subIds: Set<string> }>) => {
    setTabState((prev) => {
      const next = [...prev];
      const item = next[index];
      const opt = ADMIN_TAB_SUB_OPTIONS[index];
      if (item == null || opt == null) return prev;
      let { full, subIds } = item;
      if (update.full !== undefined) {
        full = update.full;
        subIds = full ? new Set(opt.subTabs.map((s) => s.id)) : new Set(update.subIds ?? subIds);
      }
      if (update.subIds !== undefined) subIds = update.subIds;
      next[index] = { ...item, full, subIds };
      return next;
    });
  };

  const handleFullToggle = (index: number) => {
    const opt = ADMIN_TAB_SUB_OPTIONS[index];
    const current = tabState[index];
    if (opt == null || current == null) return;
    const newFull = !current.full;
    setTab(index, {
      full: newFull,
      subIds: newFull ? new Set(opt.subTabs.map((s) => s.id)) : new Set(),
    });
  };

  const handleSubToggle = (tabIndex: number, subId: string) => {
    const current = tabState[tabIndex];
    const opt = ADMIN_TAB_SUB_OPTIONS[tabIndex];
    if (current == null || opt == null) return;
    const nextSubs = new Set(current.subIds);
    if (nextSubs.has(subId)) nextSubs.delete(subId);
    else nextSubs.add(subId);
    const full = opt.subTabs.length > 0 && nextSubs.size === opt.subTabs.length;
    setTab(tabIndex, { full, subIds: nextSubs });
  };

  const buildTabIds = (): string[] => {
    const out: string[] = [];
    for (let i = 0; i < ADMIN_TAB_SUB_OPTIONS.length; i++) {
      const opt = ADMIN_TAB_SUB_OPTIONS[i];
      const item = tabState[i];
      if (opt == null || item == null) continue;
      const { full, subIds } = item;
      if (opt.subTabs.length === 0) {
        if (full) out.push(opt.tabId);
      } else if (full) {
        out.push(opt.tabId);
      } else {
        subIds.forEach((subId) => out.push(`${opt.tabId}:${subId}`));
      }
    }
    return out;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const result = await saveOperatorPermissionsAction(targetUserId, buildTabIds());
      if (result.ok) {
        router.push("/admin/operator-permissions");
        router.refresh();
      } else {
        setError(result.error);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        {ADMIN_TAB_SUB_OPTIONS.map((opt, index) => {
          const item = tabState[index];
          if (item == null) return null;
          const { full, subIds } = item;
          return (
            <div key={opt.tabId} className="flex flex-col gap-2">
              <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg px-3 hover:bg-muted/50">
                <Checkbox
                  checked={full || (opt.subTabs.length > 0 && subIds.size === opt.subTabs.length)}
                  onCheckedChange={() => handleFullToggle(index)}
                />
                <span className="text-sm font-medium">{opt.label}</span>
              </label>
              {opt.subTabs.length > 0 && (
                <div className="ml-6 flex flex-col gap-1.5 border-l-2 border-muted pl-3">
                  {opt.subTabs.map((sub) => (
                    <label
                      key={sub.id}
                      className="flex min-h-[40px] cursor-pointer items-center gap-3 rounded-md px-2 hover:bg-muted/30"
                    >
                      <Checkbox
                        checked={full || subIds.has(sub.id)}
                        onCheckedChange={() => handleSubToggle(index, sub.id)}
                      />
                      <span className="text-sm text-muted-foreground">{sub.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {error && (
        <p className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "저장 중…" : "저장"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/operator-permissions")}
        >
          취소
        </Button>
      </div>
    </form>
  );
}
