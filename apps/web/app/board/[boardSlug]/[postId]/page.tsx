import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@workspace/auth";
import { headers } from "next/headers";
import {
  getSharedBoardPostById,
  getAllSharedBoardCommentsWithRepliesByPostId,
  getSharedBoardRecommendCount,
  hasUserRecommendedSharedBoard,
} from "@workspace/db";
import { isAdmin } from "@/lib/admin";
import type { SharedBoardCommentRow } from "@workspace/db";
import { Button } from "@workspace/ui/components/button";
import { Pencil } from "lucide-react";
import { PostBodyMarkdown } from "@/app/bunnies/board/[boardSlug]/[postId]/post-body-markdown";
import { BoardTabs } from "../board-tabs";
import { BoardPostDetailActions } from "./post-detail-actions";
import { BoardRecommendButton } from "./recommend-button";
import { BoardCommentSection } from "./comment-section";

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

export default async function BoardPostDetailPage({
  params,
}: {
  params: Promise<{ boardSlug: string; postId: string }>;
}) {
  const { postId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  const post = await getSharedBoardPostById(postId);
  if (!post) notFound();
  const isNoticeNotVisible =
    post.boardSlug === "notice" &&
    (!post.isPublished ||
      (post.scheduledPublishAt &&
        new Date(post.scheduledPublishAt) > new Date()));
  if (isNoticeNotVisible && !(session && isAdmin(session))) {
    notFound();
  }

  const boardSlug = post.boardSlug;
  const boardName = post.boardName;
  const isAuthor = !!session && post.authorUserId === session.user.id;
  const canEditAsAdmin = !!session && isAdmin(session);
  const hasCommentsAndRecommend =
    boardSlug === "free" || boardSlug === "suggestion" || boardSlug === "qna";

  let commentsWithReplies: (SharedBoardCommentRow & {
    replies: SharedBoardCommentRow[];
  })[] = [];
  let recommendCount = 0;
  let hasRecommended = false;
  if (hasCommentsAndRecommend) {
    const [topLevel, count, recommended] = await Promise.all([
      getAllSharedBoardCommentsWithRepliesByPostId(postId),
      getSharedBoardRecommendCount(postId),
      hasUserRecommendedSharedBoard(postId, session?.user.id ?? ""),
    ]);
    commentsWithReplies = topLevel;
    recommendCount = count;
    hasRecommended = recommended;
  }

  const isEdited =
    !!post.updatedAt &&
    !!post.createdAt &&
    new Date(post.updatedAt).getTime() >
      new Date(post.createdAt).getTime();

  return (
    <div className="mx-auto min-h-[calc(100svh-3.5rem)] w-full max-w-2xl p-4 sm:p-6">
      <div className="mb-4">
        <BoardTabs />
      </div>
      <Link
        href={`/board/${encodeURIComponent(boardSlug)}`}
        className="mb-4 inline-block min-h-[44px] text-sm text-muted-foreground underline-offset-2 hover:underline"
        suppressHydrationWarning
      >
        ← {boardName}
      </Link>

      {post.coverImageUrl ? (
        <div className="mb-4 overflow-hidden rounded-xl border border-border bg-card">
          <img
            src={post.coverImageUrl}
            alt=""
            className="max-h-[50vh] w-full bg-muted/20 object-contain"
          />
        </div>
      ) : null}
      <article className="rounded-xl border bg-card">
        <header className="border-b border-border px-4 py-4">
          <p className="text-xs font-medium tabular-nums text-muted-foreground">
            No. {post.postNumber}
          </p>
          <h1 className="mt-1 text-lg font-semibold leading-snug text-foreground">
            {post.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {boardSlug === "notice"
              ? formatDateTime(post.createdAt)
              : `${post.authorNickname ?? "알 수 없음"} · ${formatDateTime(post.createdAt)}`}
            {isEdited && boardSlug !== "notice" && (
              <span className="ml-1">
                · 수정됨 ({formatDateTime(post.updatedAt)})
              </span>
            )}
          </p>
        </header>
        <div className="px-4 py-5">
          <PostBodyMarkdown body={post.body} />
        </div>
      </article>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" className="min-h-[44px]" size="sm">
          <Link href={`/board/${encodeURIComponent(boardSlug)}`}>
            목록으로
          </Link>
        </Button>
        {hasCommentsAndRecommend && (
          <BoardRecommendButton
            postId={postId}
            initialCount={recommendCount}
            initialHasRecommended={hasRecommended}
          />
        )}
        {(isAuthor || canEditAsAdmin) &&
          (boardSlug === "free" ||
            boardSlug === "suggestion" ||
            boardSlug === "qna") && (
            <>
              <Button asChild className="min-h-[44px]" size="sm">
                <Link href={`/board/${encodeURIComponent(boardSlug)}/${postId}/edit`}>
                  <Pencil className="mr-2 size-4" />
                  수정
                </Link>
              </Button>
              <BoardPostDetailActions postId={postId} />
            </>
          )}
      </div>

      {hasCommentsAndRecommend && (
        <BoardCommentSection
          postId={postId}
          sessionUserId={session?.user.id ?? null}
          commentsWithReplies={commentsWithReplies}
        />
      )}
    </div>
  );
}
