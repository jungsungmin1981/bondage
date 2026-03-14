import Link from "next/link";
import { notFound } from "next/navigation";
import { getBunnyBoardPostById } from "@workspace/db";
import { AdminNoticePostForm } from "../../new/notice-post-form";

const NOTICE_BOARD_SLUG = "notice";

function formatDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function AdminNoticeBunnyEditPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const post = await getBunnyBoardPostById(postId);
  if (!post || post.boardSlug !== NOTICE_BOARD_SLUG) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <Link
        href="/admin/notice/bunny"
        className="inline-block min-h-[44px] text-sm text-muted-foreground underline-offset-2 hover:underline"
      >
        ← 버니 공지 목록
      </Link>
      <h2 className="text-lg font-semibold text-foreground">공지 수정</h2>
      <AdminNoticePostForm
        postId={postId}
        initialValues={{
          title: post.title,
          body: post.body,
          coverImageUrl: post.coverImageUrl ?? null,
          isPublished: post.isPublished,
          scheduledPublishAt: post.scheduledPublishAt
            ? formatDatetimeLocal(new Date(post.scheduledPublishAt))
            : "",
        }}
      />
    </div>
  );
}
