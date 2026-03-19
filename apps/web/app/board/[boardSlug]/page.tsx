import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import {
  getSharedBoardBySlug,
  getSharedBoardPosts,
  getSharedBoardPostsWithRecommendCounts,
  getSharedBoardPostsWithBodies,
  getSharedBoardPostCount,
} from "@workspace/db";
import { BoardTabs } from "./board-tabs";
import { QnaAccordionList } from "./qna-accordion-list";
import { BoardWriteButton } from "./board-write-button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@workspace/ui/components/pagination";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

const POSTS_PER_PAGE = 30;

// 게시판 슬러그별 캐시 TTL
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

function buildPageUrl(boardSlug: string, page: number): string {
  const base = `/board/${encodeURIComponent(boardSlug)}`;
  return page <= 1 ? base : `${base}?page=${page}`;
}

export default async function BoardListPage({
  params,
  searchParams,
}: {
  params: Promise<{ boardSlug: string }>;
  searchParams: Promise<{ page?: string; tab?: string }>;
}) {
  const { boardSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const tab = resolvedSearchParams?.tab ?? "";

  // suggestion 게시판에서 클래스 요청 탭이면 별도 처리
  if (boardSlug === "suggestion" && tab === "class-request") {
    const { ClassRequestListSection } = await import("@/app/board/class-request/class-request-list-section");
    const { BoardTabs } = await import("./board-tabs");
    return (
      <div className="mx-auto min-h-[calc(100svh-3.5rem)] w-full max-w-2xl p-4 sm:p-6">
        <div className="mb-4">
          <BoardTabs />
        </div>
        <ClassRequestListSection />
      </div>
    );
  }

  const page = Math.max(
    1,
    parseInt(resolvedSearchParams?.page ?? "1", 10) || 1,
  );
  const offset = (page - 1) * POSTS_PER_PAGE;
  const revalidate = getBoardRevalidate(boardSlug);

  const getCachedBoard = unstable_cache(
    () => getSharedBoardBySlug(boardSlug),
    [`shared-board-slug-${boardSlug}`],
    { revalidate: 300 },
  );
  const board = await getCachedBoard();
  if (!board) notFound();

  let posts: Awaited<ReturnType<typeof getSharedBoardPosts>>;
  let postCount: number;
  let recommendCounts: Record<string, number>;
  let qnaPostsWithBodies: Awaited<
    ReturnType<typeof getSharedBoardPostsWithBodies>
  > | null = null;

  const hasCommentsAndRecommend =
    boardSlug === "free" || boardSlug === "suggestion" || boardSlug === "qna";

  if (boardSlug === "qna") {
    const boardId = board.id;
    const [postsWithBodies, count] = await Promise.all([
      unstable_cache(
        () => getSharedBoardPostsWithBodies(boardId, POSTS_PER_PAGE, offset, { onlyPublished: true }),
        [`shared-board-qna-posts-${boardSlug}-p${page}`],
        { revalidate },
      )(),
      unstable_cache(
        () => getSharedBoardPostCount(boardId, { onlyPublished: true }),
        [`shared-board-qna-count-${boardSlug}`],
        { revalidate },
      )(),
    ]);
    qnaPostsWithBodies = postsWithBodies;
    posts = postsWithBodies;
    postCount = count;
    recommendCounts = {};
  } else if (hasCommentsAndRecommend) {
    const boardId = board.id;
    const [postsWithRec, count] = await Promise.all([
      unstable_cache(
        () => getSharedBoardPostsWithRecommendCounts(boardId, POSTS_PER_PAGE, offset),
        [`shared-board-rec-posts-${boardSlug}-p${page}`],
        { revalidate },
      )(),
      unstable_cache(
        () => getSharedBoardPostCount(boardId),
        [`shared-board-count-${boardSlug}`],
        { revalidate },
      )(),
    ]);
    posts = postsWithRec;
    postCount = count;
    recommendCounts = Object.fromEntries(
      (postsWithRec as { id: string; recommendCount: number }[]).map((p) => [
        p.id,
        p.recommendCount,
      ]),
    );
  } else {
    const onlyPublished = boardSlug === "notice";
    const boardId = board.id;
    const [postsList, count] = await Promise.all([
      unstable_cache(
        () => getSharedBoardPosts(boardId, POSTS_PER_PAGE, offset, onlyPublished ? { onlyPublished: true } : undefined),
        [`shared-board-posts-${boardSlug}-p${page}`],
        { revalidate },
      )(),
      unstable_cache(
        () => getSharedBoardPostCount(boardId, onlyPublished ? { onlyPublished: true } : undefined),
        [`shared-board-count-${boardSlug}`],
        { revalidate },
      )(),
    ]);
    posts = postsList;
    postCount = count;
    recommendCounts = {};
  }

  const totalPages = Math.ceil(postCount / POSTS_PER_PAGE);

  return (
    <div className="mx-auto min-h-[calc(100svh-3.5rem)] w-full max-w-2xl p-4 sm:p-6">
      <div className="mb-4">
        <BoardTabs />
      </div>

      {boardSlug === "suggestion" && tab !== "class-request" && (
        <div className="mb-4 flex gap-0 border-b border-border text-sm">
          <a
            href="/board/suggestion"
            className="min-h-[44px] flex-1 border-b-2 border-primary px-3 py-2.5 text-center font-medium text-foreground transition sm:flex-initial sm:px-4"
          >
            수정/기능 제안
          </a>
          <a
            href="/board/suggestion?tab=class-request"
            className="min-h-[44px] flex-1 border-b-2 border-transparent px-3 py-2.5 text-center font-medium text-muted-foreground transition hover:border-muted-foreground/50 hover:text-foreground sm:flex-initial sm:px-4"
          >
            클래스 요청
          </a>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <BoardWriteButton boardSlug={boardSlug} />
      </div>

      <p className="mb-4 text-sm text-muted-foreground">{postCount}개의 글</p>

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
                  href={`/board/notice/${encodeURIComponent(post.id)}`}
                  className="flex min-h-[44px] gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-muted-foreground/30 hover:bg-muted/30 active:bg-muted/50"
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
                      <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
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
        <QnaAccordionList posts={qnaPostsWithBodies} />
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
                  href={`/board/${encodeURIComponent(boardSlug)}/${encodeURIComponent(post.id)}`}
                  className="flex min-h-[56px] flex-col justify-center gap-0.5 px-2 py-3 transition-colors hover:bg-muted/40 active:bg-muted/60"
                >
                  <span className="flex items-center gap-2">
                    <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                      #{post.postNumber}
                    </span>
                    <span className="line-clamp-2 min-w-0 flex-1 text-[15px] font-medium text-foreground">
                      {post.title}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {post.authorNickname ?? "알 수 없음"} ·{" "}
                    {formatDate(post.createdAt)}
                    {hasCommentsAndRecommend &&
                      (recommendCounts[post.id] ?? 0) > 0 && (
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
                      · 조회 {(post.viewCount ?? 0).toLocaleString()}
                    </span>
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>
      )}

      {totalPages > 1 && (
        <Pagination className="mt-8">
          <PaginationContent>
            <PaginationItem>
              {page > 1 ? (
                <PaginationPrevious
                  href={buildPageUrl(boardSlug, page - 1)}
                  text="이전"
                />
              ) : (
                <span className="flex min-h-9 min-w-9 items-center justify-center rounded-md border border-transparent px-3 opacity-50">
                  <ChevronLeftIcon className="size-4" />
                  <span className="ml-1 hidden sm:inline">이전</span>
                </span>
              )}
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => {
                if (totalPages <= 7) return true;
                if (p === 1 || p === totalPages) return true;
                if (Math.abs(p - page) <= 1) return true;
                return false;
              })
              .reduce<number[]>((acc, p, i, arr) => {
                if (i > 0 && arr[i - 1]! < p - 1) acc.push(-1);
                acc.push(p);
                return acc;
              }, [])
              .map((p, idx) =>
                p === -1 ? (
                  <PaginationItem key={`ellipsis-${idx}`}>
                    <span
                      className="flex size-9 items-center justify-center"
                      aria-hidden
                    >
                      …
                    </span>
                  </PaginationItem>
                ) : (
                  <PaginationItem key={p}>
                    <PaginationLink
                      href={buildPageUrl(boardSlug, p)}
                      isActive={p === page}
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                ),
              )}
            <PaginationItem>
              {page < totalPages ? (
                <PaginationNext
                  href={buildPageUrl(boardSlug, page + 1)}
                  text="다음"
                />
              ) : (
                <span className="flex min-h-9 min-w-9 items-center justify-center rounded-md border border-transparent px-3 opacity-50">
                  <span className="mr-1 hidden sm:inline">다음</span>
                  <ChevronRightIcon className="size-4" />
                </span>
              )}
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
