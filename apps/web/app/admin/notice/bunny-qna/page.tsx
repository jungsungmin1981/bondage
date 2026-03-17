import Link from "next/link";
import {
  getBunnyBoardBySlug,
  getBunnyBoardPosts,
  getBunnyBoardPostCount,
} from "@workspace/db";
import { Button } from "@workspace/ui/components/button";
import { ExternalLink, Pencil } from "lucide-react";

const QNA_BOARD_SLUG = "qna";
const POSTS_PER_PAGE = 50;

function formatDate(d: Date | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminNoticeBunnyQnaPage() {
  const board = await getBunnyBoardBySlug(QNA_BOARD_SLUG);
  if (!board) {
    return (
      <p className="text-sm text-muted-foreground">
        버니 전용 Q & A 게시판을 찾을 수 없습니다.
      </p>
    );
  }

  const [posts, postCount] = await Promise.all([
    getBunnyBoardPosts(board.id, POSTS_PER_PAGE, 0),
    getBunnyBoardPostCount(board.id),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{postCount}개의 글</p>
        <Button asChild className="min-h-[44px] shrink-0">
          <Link href="/admin/notice/bunny-qna/new">
            <Pencil className="mr-2 size-4" />
            글 쓰기
          </Link>
        </Button>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-12 text-center text-sm text-muted-foreground">
          등록된 글이 없습니다.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {posts.map((post) => (
            <li key={post.id}>
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-4 transition-colors hover:border-muted-foreground/30 hover:bg-muted/30 sm:flex-nowrap">
                <Link
                  href={`/admin/notice/bunny-qna/${post.id}/edit`}
                  className="flex min-w-0 flex-1 gap-4"
                >
                  {post.coverImageUrl ? (
                    <span className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-muted/30">
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
                      <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-foreground">
                        {post.title}
                      </span>
                    </span>
                    <p className="mt-2 text-xs text-muted-foreground">
                      작성자: {post.authorNickname ?? "알 수 없음"} ·{" "}
                      {formatDate(post.createdAt)}
                    </p>
                  </span>
                </Link>
                <Link
                  href={`/admin/notice/bunny-qna/${post.id}/edit`}
                  className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                >
                  <ExternalLink className="size-4" aria-hidden />
                  상세보기
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
