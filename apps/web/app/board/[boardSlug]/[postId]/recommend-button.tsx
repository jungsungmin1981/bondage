"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { ThumbsUp } from "lucide-react";
import { toggleSharedBoardRecommendAction } from "@/app/board/actions";

type Props = {
  postId: string;
  initialCount: number;
  initialHasRecommended: boolean;
};

export function BoardRecommendButton({
  postId,
  initialCount,
  initialHasRecommended,
}: Props) {
  const router = useRouter();
  const [count, setCount] = useState(initialCount);
  const [hasRecommended, setHasRecommended] = useState(initialHasRecommended);
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (pending) return;
    setPending(true);
    const result = await toggleSharedBoardRecommendAction(postId);
    setPending(false);
    if (result.ok) {
      setHasRecommended(result.recommended);
      setCount((c) => (result.recommended ? c + 1 : Math.max(0, c - 1)));
      router.refresh();
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="min-h-[44px]"
      onClick={handleClick}
      disabled={pending}
      aria-pressed={hasRecommended}
    >
      <ThumbsUp
        className={`mr-2 size-4 ${hasRecommended ? "fill-current" : ""}`}
        aria-hidden
      />
      <span className="text-blue-600">
        추천
        {count > 0 ? (
          <span className="ml-1.5 inline-flex min-w-[1.5rem] items-center justify-center rounded-md bg-blue-100 px-1.5 py-0.5 text-center text-sm font-semibold tabular-nums">
            {count}
          </span>
        ) : null}
      </span>
    </Button>
  );
}
