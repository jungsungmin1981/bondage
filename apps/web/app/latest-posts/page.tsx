import { auth } from "@workspace/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import {
  getLatestPublicPosts,
  getLatestPublicPostsCount,
  getPostLikesStateForPostIds,
} from "@workspace/db";
import Link from "next/link";
import { LatestPostsGrid } from "./latest-posts-grid";

const PAGE_SIZE = 15;

function getCachedPosts(page: number) {
  const offset = (page - 1) * PAGE_SIZE;
  return unstable_cache(
    () => getLatestPublicPosts(PAGE_SIZE, offset),
    [`latest-public-posts-page-${page}`],
    { revalidate: 60, tags: ["latest-public-posts"] },
  )();
}

const getCachedCount = unstable_cache(
  () => getLatestPublicPostsCount(),
  ["latest-public-posts-count"],
  { revalidate: 60, tags: ["latest-public-posts"] },
);

export default async function LatestPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10));

  const [posts, total] = await Promise.all([
    getCachedPosts(page),
    getCachedCount(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const postIds = posts.map((p) => p.postId);
  const likeMap = postIds.length > 0
    ? await getPostLikesStateForPostIds(postIds, session.user.id)
    : new Map();

  const likeStates: Record<string, { count: number; liked: boolean }> = {};
  for (const [id, state] of likeMap) {
    likeStates[id] = { count: state.count, liked: state.liked };
  }

  // 표시할 페이지 번호 범위 계산 (현재 페이지 기준 ±2)
  const pageRange = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2,
  );

  return (
    <div className="min-h-[calc(100svh-3.5rem)] py-4 sm:py-6">
      <div className="mb-4 flex items-baseline gap-3 sm:mb-6">
        <h1 className="text-xl font-semibold sm:text-2xl">최신 게시물</h1>
        {total > 0 && (
          <span className="text-sm text-muted-foreground">
            총 {total}건 · {safePage}/{totalPages} 페이지
          </span>
        )}
      </div>

      {posts.length === 0 ? (
        <p className="py-20 text-center text-sm text-muted-foreground">
          등록된 게시물이 없습니다.
        </p>
      ) : (
        <>
          <LatestPostsGrid posts={posts} likeStates={likeStates} />

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <nav
              className="mt-8 flex items-center justify-center gap-1"
              aria-label="페이지 이동"
            >
              {/* 이전 */}
              {safePage > 1 ? (
                <Link
                  href={`/latest-posts?page=${safePage - 1}`}
                  className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border bg-background text-sm transition hover:bg-muted"
                  aria-label="이전 페이지"
                >
                  ‹
                </Link>
              ) : (
                <span className="flex min-h-[40px] min-w-[40px] cursor-not-allowed items-center justify-center rounded-lg border text-sm text-muted-foreground/40">
                  ‹
                </span>
              )}

              {/* 페이지 번호 */}
              {pageRange.map((p, idx) => {
                const prev = pageRange[idx - 1];
                const showEllipsis = prev !== undefined && p - prev > 1;
                return (
                  <span key={p} className="flex items-center gap-1">
                    {showEllipsis && (
                      <span className="flex min-h-[40px] min-w-[40px] items-center justify-center text-sm text-muted-foreground">
                        …
                      </span>
                    )}
                    {p === safePage ? (
                      <span
                        className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground"
                        aria-current="page"
                      >
                        {p}
                      </span>
                    ) : (
                      <Link
                        href={`/latest-posts?page=${p}`}
                        className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border bg-background text-sm transition hover:bg-muted"
                      >
                        {p}
                      </Link>
                    )}
                  </span>
                );
              })}

              {/* 다음 */}
              {safePage < totalPages ? (
                <Link
                  href={`/latest-posts?page=${safePage + 1}`}
                  className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border bg-background text-sm transition hover:bg-muted"
                  aria-label="다음 페이지"
                >
                  ›
                </Link>
              ) : (
                <span className="flex min-h-[40px] min-w-[40px] cursor-not-allowed items-center justify-center rounded-lg border text-sm text-muted-foreground/40">
                  ›
                </span>
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
