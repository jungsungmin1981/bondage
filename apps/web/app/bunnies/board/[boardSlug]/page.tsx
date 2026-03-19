import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import {
  getBunnyBoardBySlug,
  getBunnyBoards,
  getBunnyBoardPosts,
  getBunnyBoardPostsWithRecommendCounts,
  getBunnyBoardPostsWithBodies,
  getBunnyBoardPostCount,
} from "@workspace/db";
import { BunnyBoardTabs } from "./board-tabs";
import { BunnyQnaAccordionList } from "./qna-accordion-list";
import { BunnyBoardWriteButton } from "./board-write-button";

const POSTS_PER_PAGE = 20;

function getBoardRevalidate(slug: string): number {
  if (slug === "notice" || slug === "qna" || slug === "review") return 120;
  return 30;
}

function formatDate(d: Date | null): string {
  if (!d) return "-";
  const t = new Date(d);
  const now = new Date();
  const diffMs = now.getTime() - t.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
    if (diffHours === 0) {
      const diffMins = Math.floor(diffMs / (60 * 1000));
      if (diffMins < 1) return "방금 전";
      return `${diffMins}분 전`;
    }
    return `${diffHours}시간 전`;
  }
  if (diffDays === 1) return "어제";
  if (diffDays < 7) return `${diffDays}일 전`;
  return t.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default async function BunnyBoardListPage({
  params,
}: {
  params: Promise<{ boardSlug: string }>;
}) {
  const { boardSlug } = await params;
  const revalidate = getBoardRevalidate(boardSlug);

  const [board, boards] = await Promise.all([
    unstable_cache(
      () => getBunnyBoardBySlug(boardSlug),
      [`bunny-board-slug-${boardSlug}`],
      { revalidate: 300 },
    )(),
    unstable_cache(
      () => getBunnyBoards(),
      ["bunny-boards-list"],
      { revalidate: 300 },
    )(),
  ]);

  if (!board) notFound();

  let posts: Awaited<ReturnType<typeof getBunnyBoardPosts>>;
  let postCount: number;
  let recommendCounts: Record<string, number>;
  let qnaPostsWithBodies: Awaited<
    ReturnType<typeof getBunnyBoardPostsWithBodies>
  > | null = null;

  const boardId = board.id;

  if (boardSlug === "qna") {
    const [postsWithBodies, count] = await Promise.all([
      unstable_cache(
        () => getBunnyBoardPostsWithBodies(boardId, POSTS_PER_PAGE, 0, { onlyPublished: true }),
        [`bunny-board-qna-posts-${boardSlug}`],
        { revalidate },
      )(),
      unstable_cache(
        () => getBunnyBoardPostCount(boardId, { onlyPublished: true }),
        [`bunny-board-qna-count-${boardSlug}`],
        { revalidate },
      )(),
    ]);
    qnaPostsWithBodies = postsWithBodies;
    posts = postsWithBodies;
    postCount = count;
    recommendCounts = {};
  } else if (boardSlug === "free") {
    const [postsWithRec, count] = await Promise.all([
      unstable_cache(
        () => getBunnyBoardPostsWithRecommendCounts(boardId, POSTS_PER_PAGE, 0),
        [`bunny-board-rec-posts-${boardSlug}`],
        { revalidate },
      )(),
      unstable_cache(
        () => getBunnyBoardPostCount(boardId),
        [`bunny-board-count-${boardSlug}`],
        { revalidate },
      )(),
    ]);
    posts = postsWithRec;
    postCount = count;
    recommendCounts = Object.fromEntries(
      postsWithRec.map((p) => [p.id, p.recommendCount]),
    );
  } else {
    const onlyPublished = boardSlug === "notice";
    const [postsList, count] = await Promise.all([
      unstable_cache(
        () => getBunnyBoardPosts(boardId, POSTS_PER_PAGE, 0, onlyPublished ? { onlyPublished: true } : undefined),
        [`bunny-board-posts-${boardSlug}`],
        { revalidate },
      )(),
      unstable_cache(
        () => getBunnyBoardPostCount(boardId, onlyPublished ? { onlyPublished: true } : undefined),
        [`bunny-board-count-${boardSlug}`],
        { revalidate },
      )(),
    ]);
    posts = postsList;
    postCount = count;
    recommendCounts = {};
  }

  return (
    <div className="mx-auto min-h-[calc(100svh-3.5rem)] w-full max-w-2xl p-4 sm:p-6">
      <div className="mb-4">
        <BunnyBoardTabs boards={boards.map((b) => ({ slug: b.slug, name: b.name }))} />
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <BunnyBoardWriteButton boardSlug={boardSlug} />
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        {postCount}개의 글
      </p>

      {boardSlug === "notice" ? (
        <ul className="flex flex-col gap-3">
          {posts.length === 0 ? (
            <li className="rounded-xl border border-border bg-card py-12 text-center text-sm text-muted-foreground">
              등록된 글이 없습니다.
            </li>
          ) : (
            posts.map((post) => (
              <li key={post.id}>
                <Link
                  href={`/bunnies/board/notice/${encodeURIComponent(post.id)}`}
                  className="flex gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-muted-foreground/30 hover:bg-muted/30 active:bg-muted/50 min-h-[44px]"
                >
                  {post.coverImageUrl ? (
                    <span className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-muted/30">
                      <img
                        src={post.coverImageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </span>
                  ) : null}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="shrink-0 text-xs font-medium text-muted-foreground tabular-nums">
                        #{post.postNumber}
                      </span>
                      <span className="line-clamp-2 min-w-0 flex-1 text-[15px] font-semibold text-foreground">
                        {post.title}
                      </span>
                    </span>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatDate(post.createdAt)}
                    </p>
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>
      ) : boardSlug === "qna" && qnaPostsWithBodies ? (
        <BunnyQnaAccordionList posts={qnaPostsWithBodies} />
      ) : (
        <ul className="flex flex-col gap-0 border-t border-border">
          {posts.length === 0 ? (
            <li className="border-b border-border py-8 text-center text-sm text-muted-foreground">
              등록된 글이 없습니다.
            </li>
          ) : (
            posts.map((post) => (
              <li key={post.id} className="border-b border-border">
                <Link
                  href={`/bunnies/board/${encodeURIComponent(boardSlug)}/${encodeURIComponent(post.id)}`}
                  className="flex min-h-[56px] flex-col justify-center gap-0.5 px-2 py-3 transition-colors hover:bg-muted/40 active:bg-muted/60"
                >
                  <span className="flex items-center gap-2">
                    <span className="shrink-0 text-xs font-medium text-muted-foreground tabular-nums">
                      #{post.postNumber}
                    </span>
                    <span className="line-clamp-2 min-w-0 flex-1 text-[15px] font-medium text-foreground">
                      {post.title}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {post.authorNickname ?? "알 수 없음"} · {formatDate(post.createdAt)}
                    {boardSlug === "free" && (recommendCounts[post.id] ?? 0) > 0 && (
                      <span className="ml-1.5 inline-flex items-center gap-1 text-blue-600">
                        · 추천
                        <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-md bg-blue-100 px-1.5 py-0.5 text-center text-xs font-semibold tabular-nums">
                          {recommendCounts[post.id]}
                        </span>
                      </span>
                    )}
                    {post.updatedAt &&
                      post.createdAt &&
                      new Date(post.updatedAt).getTime() >
                        new Date(post.createdAt).getTime() && (
                        <span className="ml-1 text-muted-foreground/80">
                          · 수정됨
                        </span>
                      )}
                    <span className="ml-1.5 text-muted-foreground/60">
                      · 조회 {post.viewCount.toLocaleString()}
                    </span>
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
