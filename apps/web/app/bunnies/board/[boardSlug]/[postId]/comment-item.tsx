"use client";

import { useActionState, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CommentRow } from "@workspace/db";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  createCommentAction,
  updateCommentAction,
  deleteCommentAction,
} from "@/app/bunnies/board/actions";

export function CommentItem({
  comment,
  replies,
  postId,
  sessionUserId,
  formatDateTime,
  onSuccess,
  isReply = false,
}: {
  comment: CommentRow;
  replies: CommentRow[];
  postId: string;
  sessionUserId: string | null;
  formatDateTime: (d: Date | null) => string;
  onSuccess: () => void;
  isReply?: boolean;
}) {
  const router = useRouter();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showReplies, setShowReplies] = useState(true);
  const [editing, setEditing] = useState(false);
  const handledUpdateSuccess = useRef(false);
  const handledReplySuccess = useRef(false);

  const isOwn = !!sessionUserId && comment.authorUserId === sessionUserId;
  const isDeleted = !!comment.deletedAt;
  const isEdited =
    !!comment.updatedAt &&
    !!comment.createdAt &&
    new Date(comment.updatedAt).getTime() > new Date(comment.createdAt).getTime();

  type CommentState = { ok: true } | { ok: false; error: string } | null;
  const [updateState, updateFormAction] = useActionState(
    (prev: CommentState, formData: FormData) =>
      updateCommentAction(comment.id, prev, formData),
    null as CommentState,
  );

  const [replyState, replyFormAction] = useActionState(
    (prev: CommentState, formData: FormData) =>
      createCommentAction(postId, prev, formData),
    null as CommentState,
  );

  useEffect(() => {
    if (updateState?.ok === true && !handledUpdateSuccess.current) {
      handledUpdateSuccess.current = true;
      setEditing(false);
      onSuccess();
      router.refresh();
    }
  }, [updateState, onSuccess, router]);

  useEffect(() => {
    if (replyState?.ok === true && !handledReplySuccess.current) {
      handledReplySuccess.current = true;
      setShowReplyForm(false);
      onSuccess();
      router.refresh();
    }
  }, [replyState, onSuccess, router]);

  async function handleDelete() {
    if (!confirm("댓글을 삭제하시겠습니까?")) return;
    const result = await deleteCommentAction(comment.id);
    if (result.ok) {
      onSuccess();
      router.refresh();
    } else {
      alert(result.error);
    }
  }

  const replyCount = replies.length;
  const hasReplies = replyCount > 0;

  return (
    <li
      className={isReply ? "ml-4 border-l-2 border-muted/50 pl-3" : ""}
    >
      <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
        {isDeleted ? (
          <p className="text-sm italic text-muted-foreground">
            삭제된 댓글입니다.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {(() => {
                const nickname = comment.authorNickname ?? "알 수 없음";
                const href =
                  comment.authorProfileId && comment.authorMemberType !== "operator"
                    ? comment.authorMemberType === "rigger"
                      ? `/rigger/${comment.authorProfileId}`
                      : `/bunnies/${comment.authorProfileId}`
                    : null;
                return href ? (
                  <Link
                    href={href}
                    className="font-medium text-foreground hover:underline underline-offset-2"
                  >
                    {nickname}
                  </Link>
                ) : (
                  <span className="font-medium text-foreground">{nickname}</span>
                );
              })()}
              <span className="text-muted-foreground">
                {formatDateTime(comment.createdAt)}
              </span>
              {isEdited && (
                <span className="text-muted-foreground">
                  · 수정됨 ({formatDateTime(comment.updatedAt)})
                </span>
              )}
            </div>
            {!editing ? (
              <>
                <p className="mt-1 whitespace-pre-wrap break-words text-[15px] text-foreground">
                  {comment.body}
                </p>
                {isOwn && (
                  <div className="mt-2 flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="min-h-[36px] text-xs"
                      onClick={() => {
                        handledUpdateSuccess.current = false;
                        setEditing(true);
                      }}
                    >
                      수정
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="min-h-[36px] text-xs text-destructive hover:text-destructive"
                      onClick={handleDelete}
                    >
                      삭제
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <form
                action={updateFormAction}
                className="mt-2 flex flex-col gap-2"
              >
                <Textarea
                  name="body"
                  defaultValue={comment.body}
                  required
                  maxLength={2000}
                  rows={3}
                  className="min-h-[60px]"
                />
                {updateState?.ok === false && updateState.error && (
                  <p className="text-sm text-destructive">{updateState.error}</p>
                )}
                <div className="flex gap-2">
                  <Button type="submit" size="sm" className="min-h-[36px]">
                    저장
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-[36px]"
                    onClick={() => setEditing(false)}
                  >
                    취소
                  </Button>
                </div>
              </form>
            )}
          </>
        )}
      </div>

      {!isReply && (hasReplies || sessionUserId) && (
        <div className="mt-2">
          {hasReplies && (
            <button
              type="button"
              className="min-h-[44px] text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setShowReplies((v) => !v)}
            >
              {showReplies ? "답글 접기" : `답글 ${replyCount}개`}
            </button>
          )}
          {showReplies && replies.length > 0 && (
            <ul className="mt-2 flex flex-col gap-2">
              {replies.map((r) => (
                <CommentItem
                  key={r.id}
                  comment={r}
                  replies={[]}
                  postId={postId}
                  sessionUserId={sessionUserId}
                  formatDateTime={formatDateTime}
                  onSuccess={onSuccess}
                  isReply
                />
              ))}
            </ul>
          )}
          {sessionUserId && !isDeleted && (
            <>
              {!showReplyForm ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-1 min-h-[36px] text-sm text-muted-foreground"
                  onClick={() => {
                    handledReplySuccess.current = false;
                    setShowReplyForm(true);
                  }}
                >
                  답글 달기
                </Button>
              ) : (
                <form
                  action={replyFormAction}
                  className="mt-2 flex flex-col gap-2"
                >
                  <input type="hidden" name="parentId" value={comment.id} />
                  <Textarea
                    name="body"
                    placeholder="답글을 입력하세요"
                    required
                    maxLength={2000}
                    rows={2}
                    className="min-h-[60px]"
                  />
                  {replyState?.ok === false && replyState.error && (
                    <p className="text-sm text-destructive">{replyState.error}</p>
                  )}
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" className="min-h-[36px]">
                      답글 등록
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-[36px]"
                      onClick={() => setShowReplyForm(false)}
                    >
                      취소
                    </Button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      )}
    </li>
  );
}
