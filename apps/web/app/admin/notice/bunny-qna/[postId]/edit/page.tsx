import Link from "next/link";
import { notFound } from "next/navigation";
import { getBunnyBoardPostById } from "@workspace/db";
import { AdminBunnyQnaPostForm } from "@/app/admin/notice/bunny-qna/new/bunny-qna-post-form";

const QNA_BOARD_SLUG = "qna";

export default async function AdminNoticeBunnyQnaEditPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const post = await getBunnyBoardPostById(postId);
  if (!post || post.boardSlug !== QNA_BOARD_SLUG) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <Link
        href="/admin/notice/bunny-qna"
        className="inline-block min-h-[44px] text-sm text-muted-foreground underline-offset-2 hover:underline"
      >
        ← 버니 전용 Q & A 목록
      </Link>
      <h2 className="text-lg font-semibold text-foreground">
        버니 전용 Q & A 수정
      </h2>
      <AdminBunnyQnaPostForm
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
