import Link from "next/link";
import { notFound } from "next/navigation";
import { getSharedBoardPostById } from "@workspace/db";
import { AdminQnaPostForm } from "@/app/admin/notice/qna/new/qna-post-form";

const QNA_BOARD_SLUG = "qna";

export default async function AdminNoticeQnaEditPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const post = await getSharedBoardPostById(postId);
  if (!post || post.boardSlug !== QNA_BOARD_SLUG) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <Link
        href="/admin/notice/qna"
        className="inline-block min-h-[44px] text-sm text-muted-foreground underline-offset-2 hover:underline"
      >
        ← Q & A 목록
      </Link>
      <h2 className="text-lg font-semibold text-foreground">Q & A 수정</h2>
      <AdminQnaPostForm
        postId={postId}
        initialValues={{
          title: post.title,
          body: post.body,
          isPublished: post.isPublished,
          sortOrder: post.sortOrder ?? 0,
        }}
      />
    </div>
  );
}
