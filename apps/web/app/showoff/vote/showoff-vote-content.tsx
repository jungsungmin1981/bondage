"use client";

import { useState } from "react";
import { MonthlyHotpickCountdown } from "@/components/monthly-hotpick-countdown";
import { ShowoffTournamentView } from "../showoff-tournament-view";
import type { MonthlyHotpickPhase } from "@/lib/monthly-hotpick-period";

const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

export function ShowoffVoteContent({
  phase,
  monthKey,
  isAdmin,
}: {
  phase: MonthlyHotpickPhase;
  monthKey: string;
  isAdmin: boolean;
}) {
  const isPreview = isAdmin && phase !== "voting";
  const [previewEndDate] = useState(() =>
    isPreview ? new Date(Date.now() + FIVE_DAYS_MS) : null,
  );
  const showCountdown = phase === "voting" || isPreview;
  const overrideEndDate = isPreview ? previewEndDate ?? undefined : undefined;

  return (
    <>
      <div className="mt-4 flex justify-center rounded-lg border-2 border-amber-500/30 bg-slate-900 p-4 sm:p-5">
        <MonthlyHotpickCountdown
          phase={showCountdown ? "voting" : phase}
          monthKey={monthKey}
          className={undefined}
          overrideEndDate={overrideEndDate}
        />
      </div>

      <section className="mt-6 flex flex-col items-center justify-center">
        <ShowoffTournamentView
          monthKey={monthKey}
          buttonLabel="투표하기"
          buttonClassName="flex h-auto w-full max-w-[280px] aspect-[3/4] min-h-[190px] items-center justify-center rounded-xl py-0 text-base font-semibold sm:min-h-[210px] sm:text-lg"
        />
      </section>
    </>
  );
}
