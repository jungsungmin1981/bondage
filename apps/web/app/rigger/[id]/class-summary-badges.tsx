"use client";

import type { ApprovedClassCountsByLevel } from "@workspace/db";
import type { PublicClassPostCountsByLevel } from "@workspace/db";

const LEVEL_LABELS: Record<keyof ApprovedClassCountsByLevel, string> = {
  beginner: "초급",
  intermediate: "중급",
  advanced: "고급",
};

const LEVEL_STYLES: Record<
  keyof ApprovedClassCountsByLevel,
  { bar: string; text: string }
> = {
  beginner: {
    bar: "bg-emerald-500 dark:bg-emerald-400",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  intermediate: {
    bar: "bg-amber-500 dark:bg-amber-400",
    text: "text-amber-600 dark:text-amber-400",
  },
  advanced: {
    bar: "bg-violet-500 dark:bg-violet-400",
    text: "text-violet-600 dark:text-violet-400",
  },
};

type Props = {
  classCounts: ApprovedClassCountsByLevel;
  totalByLevel: PublicClassPostCountsByLevel;
};

export function ClassSummaryBadges({ classCounts, totalByLevel }: Props) {
  const levels: (keyof ApprovedClassCountsByLevel)[] = [
    "beginner",
    "intermediate",
    "advanced",
  ];

  return (
    <div className="flex flex-row flex-wrap gap-2 text-sm">
      {levels.map((level) => {
        const completed = classCounts[level];
        const total = totalByLevel[level];
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
        const label = LEVEL_LABELS[level];
        const style = LEVEL_STYLES[level];
        return (
          <div
            key={level}
            className="relative min-w-0 flex-1 basis-0 overflow-hidden rounded-full bg-muted text-xs sm:min-w-[100px]"
            role="progressbar"
            aria-valuenow={completed}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-label={`${label} ${completed}/${total} ${pct}%`}
          >
            <div
              className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-300 ease-out ${style.bar}`}
              style={{ width: `${pct}%` }}
            />
            <div className="relative flex h-6 items-center justify-between px-2 [text-shadow:0_0_1px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.2)]">
              <span className="shrink-0 font-semibold text-white">
                {label}
              </span>
              <span className={`shrink-0 font-bold text-white ${style.text}`}>
                {pct}%
              </span>
              <span className="shrink-0 font-semibold text-black dark:text-gray-100">
                {completed}/{total}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
