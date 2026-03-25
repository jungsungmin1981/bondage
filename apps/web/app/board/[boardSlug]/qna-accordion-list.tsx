"use client";

import Link from "next/link";
import type { SharedBoardPostListItemWithRecommendAndBody } from "@workspace/db";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion";
import { PostBodyMarkdown } from "@/app/bunnies/board/[boardSlug]/[postId]/post-body-markdown";

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

export function QnaAccordionList({
  posts,
}: {
  posts: SharedBoardPostListItemWithRecommendAndBody[];
}) {
  if (posts.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card py-12 text-center text-sm text-muted-foreground">
        등록된 글이 없습니다.
      </div>
    );
  }

  return (
    <Accordion
      type="single"
      collapsible
      className="w-full rounded-xl border border-border bg-card"
      data-slot="accordion"
    >
      {posts.map((post) => (
        <AccordionItem
          key={post.id}
          value={post.id}
          className="border-b border-border last:border-b-0 transition-colors data-[state=open]:border-l-4 data-[state=open]:border-l-primary data-[state=open]:bg-primary/5"
        >
          <AccordionTrigger className="min-h-[56px] flex-col items-start gap-0.5 px-4 py-3 text-left hover:no-underline [&[data-state=open]]:border-b [&[data-state=open]]:border-border [&[data-state=open]]:bg-transparent">
            <span className="flex w-full items-center gap-2">
              <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground group-aria-expanded/accordion-trigger:text-primary">
                #{post.postNumber}
              </span>
              <span className="min-w-0 flex-1 text-[15px] font-medium text-foreground group-aria-expanded/accordion-trigger:font-semibold group-aria-expanded/accordion-trigger:text-primary">
                {post.title}
              </span>
            </span>
            <span className="w-full text-xs text-muted-foreground">
              {post.authorMemberType !== "operator" && post.authorProfileId ? (
                <Link
                  href={
                    post.authorMemberType === "bunny"
                      ? `/bunnies/${post.authorProfileId}`
                      : `/rigger/${post.authorProfileId}`
                  }
                  className="hover:underline hover:text-foreground"
                >
                  {post.authorNickname ?? "알 수 없음"}
                </Link>
              ) : (
                post.authorNickname ?? "알 수 없음"
              )}{" "}
              · {formatDate(post.createdAt)}
              {(post.recommendCount ?? 0) > 0 && (
                <span className="ml-1.5 inline-flex items-center gap-1 text-blue-600">
                  · 추천
                  <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-md bg-blue-100 px-1.5 py-0.5 text-center text-xs font-semibold tabular-nums dark:bg-blue-950/50">
                    {post.recommendCount}
                  </span>
                </span>
              )}
              {post.updatedAt &&
                post.createdAt &&
                new Date(post.updatedAt).getTime() >
                  new Date(post.createdAt).getTime() && (
                  <span className="ml-1 text-muted-foreground/80">· 수정됨</span>
                )}
            </span>
          </AccordionTrigger>
          <AccordionContent className="!h-auto min-h-0 px-4 pb-4 pt-0">
            <PostBodyMarkdown body={post.body} />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
