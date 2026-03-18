"use client";

import { useCallback, useEffect, useState } from "react";
import { BunnyCard } from "@/components/bunny-card";
import { Button } from "@workspace/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import {
  getShowoffSubmissionIdsForVoting,
  getShowoffSubmissionsByIds,
  voteMonthlyHotpickAction,
} from "./actions";

type SubmissionItem = {
  id: string;
  month: string;
  userId: string;
  imageUrl: string;
  createdAt?: Date | string;
};

type Phase = "loading" | "vote" | "submitting" | "done";

export function ShowoffTournamentView({
  monthKey,
  buttonLabel = "지금 확인하기",
  buttonClassName,
}: {
  monthKey: string;
  buttonLabel?: string;
  buttonClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [ids, setIds] = useState<string[]>([]);
  const [round, setRound] = useState<string[]>([]);
  const [pairIndex, setPairIndex] = useState(0);
  const [nextRound, setNextRound] = useState<string[]>([]);
  const [cache, setCache] = useState<Record<string, SubmissionItem>>({});
  const [phase, setPhase] = useState<Phase>("loading");
  const [completedVote, setCompletedVote] = useState(false);
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [votedSubmission, setVotedSubmission] =
    useState<SubmissionItem | null>(null);

  const loadIds = useCallback(async () => {
    setPhase("loading");
    if (!open) setCompletedVote(false);
    setAlreadyVoted(false);
    setCache({});
    const { ids: nextIds, alreadyVoted: voted, votedSubmission: votedItem } =
      await getShowoffSubmissionIdsForVoting(monthKey);
    setIds(nextIds ?? []);
    setAlreadyVoted(voted ?? false);
    if (votedItem) setVotedSubmission(votedItem);
    if (voted) {
      setPhase("done");
      return;
    }
    if (!nextIds?.length) {
      setPhase("done");
      return;
    }
    if (nextIds.length === 1) {
      setRound(nextIds);
      setPairIndex(0);
      setNextRound([]);
      setPhase("vote");
      return;
    }
    setRound([...nextIds]);
    setPairIndex(0);
    setNextRound([]);
    setPhase("vote");
  }, [monthKey]);

  useEffect(() => {
    loadIds();
  }, [monthKey]);

  useEffect(() => {
    if (open) loadIds();
  }, [open, loadIds]);

  const leftId = round[pairIndex * 2];
  const rightId = round[pairIndex * 2 + 1];
  const pairCount = Math.floor(round.length / 2);
  const hasBye = round.length % 2 === 1;
  const currentPairNumber = pairIndex + 1;
  const left = leftId ? cache[leftId] : null;
  const right = rightId ? cache[rightId] : null;

  useEffect(() => {
    if (phase !== "vote" || !leftId || !rightId) return;
    if (cache[leftId] && cache[rightId]) return;
    const toFetch = [leftId, rightId].filter((id) => !cache[id]);
    getShowoffSubmissionsByIds(monthKey, toFetch).then(({ items: nextItems }) => {
      setCache((prev) => {
        const next = { ...prev };
        for (const item of nextItems) next[item.id] = item;
        return next;
      });
    });
  }, [phase, leftId, rightId, monthKey, leftId != null ? cache[leftId] : undefined, rightId != null ? cache[rightId] : undefined]);

  useEffect(() => {
    if (phase !== "vote" || round.length !== 1) return;
    const singleId = round[0];
    if (!singleId || cache[singleId]) return;
    getShowoffSubmissionsByIds(monthKey, [singleId]).then(({ items: nextItems }) => {
      setCache((prev) => {
        const next = { ...prev };
        for (const item of nextItems) next[item.id] = item;
        return next;
      });
    });
  }, [phase, round, monthKey, cache]);

  const pick = useCallback(
    (chosenId: string) => {
      const newNextRound = [...nextRound, chosenId];
      const nextPairIndex = pairIndex + 1;
      if (nextPairIndex >= pairCount) {
        const fullNext = hasBye
          ? [...newNextRound, round[round.length - 1]!]
          : newNextRound;
        if (fullNext.length === 1) {
          const winnerId = fullNext[0]!;
          const winnerItem = cache[winnerId] ?? null;
          setPhase("submitting");
          voteMonthlyHotpickAction(winnerId).finally(() => {
            if (winnerItem) setVotedSubmission(winnerItem);
            setCompletedVote(true);
            setPhase("done");
            setOpen(false);
          });
          setRound([]);
          setPairIndex(0);
          setNextRound([]);
          return;
        }
        setRound(fullNext);
        setPairIndex(0);
        setNextRound([]);
        return;
      }
      setNextRound(newNextRound);
      setPairIndex(nextPairIndex);
    },
    [pairIndex, pairCount, hasBye, nextRound, round, cache],
  );

  const pickLeft = useCallback(() => {
    if (leftId) pick(leftId);
  }, [leftId, pick]);

  const pickRight = useCallback(() => {
    if (rightId) pick(rightId);
  }, [rightId, pick]);

  const handleSingleVote = useCallback(() => {
    const winnerId = round[0];
    if (!winnerId) return;
    const winnerItem = cache[winnerId] ?? null;
    setPhase("submitting");
    voteMonthlyHotpickAction(winnerId).finally(() => {
      if (winnerItem) setVotedSubmission(winnerItem);
      setCompletedVote(true);
      setPhase("done");
      setOpen(false);
    });
  }, [round, cache]);

  const singleItem = round.length === 1 ? cache[round[0]!] : null;

  return (
    <>
      {votedSubmission ? (
        <div className="flex w-full max-w-[280px] flex-col" aria-label="투표한 사진">
          <div className="w-full overflow-hidden rounded-xl shadow-lg aspect-[3/4] min-h-[190px] sm:min-h-[210px]">
            <BunnyCard cardImageUrl={votedSubmission.imageUrl} objectFit="contain" />
          </div>
          <p className="mt-2 text-center text-xs font-bold text-muted-foreground">
            투표 완료
          </p>
        </div>
      ) : (
        <Button
          onClick={() => setOpen(true)}
          variant="default"
          size="lg"
          className={buttonClassName}
        >
          {buttonLabel}
        </Button>
      )}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="flex h-[90vh] flex-col">
          <SheetHeader className="sr-only">
            <SheetTitle>인기 투표</SheetTitle>
          </SheetHeader>
          <div className="flex flex-1 flex-col items-center justify-center gap-4 overflow-hidden p-4">
            {phase === "loading" && (
              <p className="text-sm text-muted-foreground">불러오는 중…</p>
            )}
            {phase === "done" && completedVote && (
              <p className="text-sm font-medium text-muted-foreground">
                투표가 완료되었습니다.
              </p>
            )}
            {phase === "submitting" && (
              <p className="text-sm text-muted-foreground">저장 중…</p>
            )}
            {phase === "vote" && round.length === 1 && (
              <div className="flex w-full max-w-md flex-col items-center gap-4">
                {singleItem ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      이 사진으로 투표하시겠어요?
                    </p>
                    <div className="w-full overflow-hidden rounded-xl shadow-lg">
                      <BunnyCard cardImageUrl={singleItem.imageUrl} />
                    </div>
                    <Button onClick={handleSingleVote} className="min-h-[44px]">
                      이걸로 투표
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">불러오는 중…</p>
                )}
              </div>
            )}
            {phase === "vote" && round.length >= 2 && leftId && rightId && (
              <>
                <p className="text-sm text-muted-foreground">
                  추천할 사진 선택하세요
                </p>
                {!left || !right ? (
                  <p className="text-sm text-muted-foreground">불러오는 중…</p>
                ) : (
                  <div className="grid w-full max-w-md grid-cols-2 gap-3 sm:gap-4">
                    <button
                      type="button"
                      onClick={pickLeft}
                      className="flex min-h-[44px] flex-col overflow-hidden rounded-xl shadow-lg outline-none ring-offset-2 focus-visible:ring-2 active:opacity-90"
                      aria-label="왼쪽 사진 선택"
                    >
                      <div className="aspect-[3/4] w-full">
                        <BunnyCard cardImageUrl={left.imageUrl} />
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={pickRight}
                      className="flex min-h-[44px] flex-col overflow-hidden rounded-xl shadow-lg outline-none ring-offset-2 focus-visible:ring-2 active:opacity-90"
                      aria-label="오른쪽 사진 선택"
                    >
                      <div className="aspect-[3/4] w-full">
                        <BunnyCard cardImageUrl={right.imageUrl} />
                      </div>
                    </button>
                  </div>
                )}
              </>
            )}
            {phase === "done" && !completedVote && alreadyVoted && (
              <p className="text-sm text-muted-foreground">
                이미 투표하셨습니다. 다음 투표 기간에 참여해 주세요.
              </p>
            )}
            {phase === "done" && !completedVote && !alreadyVoted && (
              <p className="text-sm text-muted-foreground">
                투표할 사진이 없습니다.
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
