"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import type { SharedBoardCommentRow } from "@workspace/db";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import { createSharedBoardCommentAction } from "@/app/board/actions";
import { BoardCommentItem } from "./comment-item";

type CommentWithReplies = SharedBoardCommentRow & {
  replies: SharedBoardCommentRow[];
};

function formatDateTime(d: Date | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function BoardCommentSection({
  postId,
  sessionUserId,
  commentsWithReplies,
}: {
  postId: string;
  sessionUserId: string | null;
  commentsWithReplies: CommentWithReplies[];
}) {
  const router = useRouter();
  const totalCount = commentsWithReplies.reduce(
    (acc, c) => acc + 1 + c.replies.length,
    0,
  );
  type CommentState = { ok: true } | { ok: false; error: string } | null;
  const [state, formAction] = useActionState(
    (prev: CommentState, formData: FormData) =>
      createSharedBoardCommentAction(postId, prev, formData),
    null as CommentState,
  );

  return (
    <section className="mt-10 border-t border-border pt-6" aria-label="댓글">
      <h2 className="mb-4 text-base font-semibold text-foreground">
        댓글 {totalCount}
      </h2>

      {sessionUserId ? (
        <form action={formAction} className="mb-6 flex flex-col gap-2">
          <Textarea
            name="body"
            placeholder="댓글을 입력하세요"
            required
            maxLength={2000}
            rows={3}
            className="min-h-[80px] resize-y"
          />
          {state?.ok === false && state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <Button type="submit" className="min-h-[44px] w-fit">
            댓글 등록
          </Button>
        </form>
      ) : (
        <p className="mb-6 text-sm text-muted-foreground">
          로그인하면 댓글을 작성할 수 있습니다.
        </p>
      )}

      <ul className="flex flex-col gap-4">
        {commentsWithReplies.length === 0 ? (
          <li className="py-6 text-center text-sm text-muted-foreground">
            댓글이 없습니다.
          </li>
        ) : (
          commentsWithReplies.map((comment) => (
            <BoardCommentItem
              key={comment.id}
              comment={comment}
              replies={comment.replies}
              postId={postId}
              sessionUserId={sessionUserId}
              formatDateTime={formatDateTime}
              onSuccess={() => router.refresh()}
            />
          ))
        )}
      </ul>
    </section>
  );
}
