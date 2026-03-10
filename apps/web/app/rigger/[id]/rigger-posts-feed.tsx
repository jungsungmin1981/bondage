"use client";

import type React from "react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SerializedPost } from "@/lib/rigger-posts-types";
import { PAGE_SIZE } from "@/lib/rigger-posts-constants";
import { loadMoreRiggerPosts } from "./post-feed-actions";
import { PostLikeButton } from "./post-like-button";
import { PostCommentBlock } from "./post-comment-block";

type Props = {
  riggerId: string;
  sessionUserId: string;
  initialPosts: SerializedPost[];
  initialLikeByPostId: Record<string, { count: number; liked: boolean }>;
  initialCommentsByPhotoId: Record<string, unknown[]>;
  initialHasMore: boolean;
};

function PostCard({
  post,
  riggerId,
  sessionUserId,
  like,
  initialComments,
}: {
  post: SerializedPost;
  riggerId: string;
  sessionUserId: string;
  like: { count: number; liked: boolean };
  initialComments: React.ComponentProps<typeof PostCommentBlock>["initialComments"];
}) {
  const createdAt = post.createdAt ? new Date(post.createdAt) : null;
  return (
    <li className="min-w-0">
      <div className="relative flex flex-col overflow-visible rounded-2xl border border-border bg-card p-2 shadow-sm">
        <p className="shrink-0 text-[10px] text-muted-foreground">
          {createdAt && !Number.isNaN(createdAt.getTime())
            ? createdAt.toLocaleString("ko-KR", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })
            : ""}
        </p>
        <p
          className="mt-1 shrink-0 truncate text-xs font-medium text-foreground"
          title={post.caption?.trim() || "제목 없음"}
        >
          {post.caption?.trim() || "제목 없음"}
        </p>
        <Link
          href={`/rigger/${encodeURIComponent(riggerId)}/photos`}
          className="mt-1 block"
        >
          <div className="h-52 w-full shrink-0 overflow-hidden rounded-xl bg-muted sm:h-60">
            {post.photos.length === 3 ? (
              <div className="grid h-full grid-cols-2 grid-rows-2 gap-0.5">
                <div className="relative row-span-2 min-h-0 overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.photos[0]!.imagePath}
                    alt={post.caption ?? "등록된 사진"}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="relative min-h-0 overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.photos[1]!.imagePath}
                    alt={post.caption ?? "등록된 사진"}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="relative min-h-0 overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.photos[2]!.imagePath}
                    alt={post.caption ?? "등록된 사진"}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            ) : post.photos.length === 1 ? (
              <div className="relative h-full min-h-0 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.photos[0]!.imagePath}
                  alt={post.caption ?? "등록된 사진"}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : post.photos.length === 2 ? (
              <div className="grid h-full grid-cols-2 gap-0.5">
                {post.photos.map((photo) => (
                  <div key={photo.id} className="relative min-h-0 overflow-hidden bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.imagePath}
                      alt={post.caption ?? "등록된 사진"}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid h-full grid-cols-2 grid-rows-2 gap-0.5">
                {post.photos.map((photo) => (
                  <div key={photo.id} className="relative min-h-0 overflow-hidden bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.imagePath}
                      alt={post.caption ?? "등록된 사진"}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </Link>
        <div className="relative z-10 mt-2 shrink-0 border-t border-border/60 pt-2">
          <div className="flex items-start gap-6 pl-3 sm:pl-4">
            <div className="flex h-7 shrink-0 items-center">
              <PostLikeButton
                riggerId={riggerId}
                postId={post.postId}
                initialCount={like.count}
                initialLiked={like.liked}
                isOwnPost={post.photos[0]?.userId === sessionUserId}
              />
            </div>
            {post.photos[0] && (
              <PostCommentBlock
                riggerId={riggerId}
                photoId={post.photos[0].id}
                initialComments={initialComments}
              />
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

export function RiggerPostsFeed({
  riggerId,
  sessionUserId,
  initialPosts,
  initialLikeByPostId,
  initialCommentsByPhotoId,
  initialHasMore,
}: Props) {
  const [posts, setPosts] = useState<SerializedPost[]>(initialPosts);
  const [likeByPostId, setLikeByPostId] = useState(initialLikeByPostId);
  const [commentsByPhotoId, setCommentsByPhotoId] = useState(
    initialCommentsByPhotoId,
  );
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const offsetRef = useRef(initialPosts.length);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const result = await loadMoreRiggerPosts(
        riggerId,
        offsetRef.current,
        PAGE_SIZE,
        sessionUserId,
      );
      if (result.posts.length === 0) {
        setHasMore(false);
        return;
      }
      setPosts((prev) => [...prev, ...result.posts]);
      setLikeByPostId((prev) => ({ ...prev, ...result.likeByPostId }));
      setCommentsByPhotoId((prev) => ({ ...prev, ...result.commentsByPhotoId }));
      offsetRef.current += result.posts.length;
      setHasMore(result.hasMore);
    } finally {
      setLoading(false);
    }
  }, [riggerId, sessionUserId, loading, hasMore]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { root: null, rootMargin: "200px", threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loadMore]);

  return (
    <>
      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {posts.map((post) => (
          <PostCard
            key={post.postId}
            post={post}
            riggerId={riggerId}
            sessionUserId={sessionUserId}
            like={likeByPostId[post.postId] ?? { count: 0, liked: false }}
            initialComments={
              (post.photos[0]
                ? commentsByPhotoId[post.photos[0].id]
                : []) as React.ComponentProps<
                typeof PostCommentBlock
              >["initialComments"]
            }
          />
        ))}
      </ul>
      {hasMore && (
        <div
          ref={sentinelRef}
          className="flex h-16 items-center justify-center text-xs text-muted-foreground"
        >
          {loading ? "불러오는 중…" : "스크롤하면 더 보기"}
        </div>
      )}
    </>
  );
}

