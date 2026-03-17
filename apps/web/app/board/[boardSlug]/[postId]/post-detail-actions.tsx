"use client";

import { useActionState, useRef } from "react";
import { Button } from "@workspace/ui/components/button";
import { Trash2 } from "lucide-react";
import { deleteSharedBoardPostFormAction } from "@/app/board/actions";

export function BoardPostDetailActions({ postId }: { postId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(
    deleteSharedBoardPostFormAction,
    null,
  );

  function handleDeleteClick(e: React.MouseEvent) {
    e.preventDefault();
    if (
      !confirm("정말 삭제하시겠습니까? 삭제된 글은 복구할 수 없습니다.")
    ) {
      return;
    }
    formRef.current?.requestSubmit();
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="inline-block"
      suppressHydrationWarning
    >
      <input type="hidden" name="postId" value={postId} />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="min-h-[44px] text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={handleDeleteClick}
      >
        <Trash2 className="mr-2 size-4" />
        삭제
      </Button>
      {state?.ok === false && state.error && (
        <p className="mt-2 text-sm text-destructive">{state.error}</p>
      )}
    </form>
  );
}
