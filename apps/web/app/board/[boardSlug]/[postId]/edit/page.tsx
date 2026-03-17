import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@workspace/auth";
import { headers } from "next/headers";
import { getSharedBoardPostById } from "@workspace/db";
import { isAdmin } from "@/lib/admin";
import { BoardPostEditForm } from "./edit-form";

export default async function BoardEditPostPage({
  params,
}: {
  params: Promise<{ boardSlug: string; postId: string }>;
}) {
  const { boardSlug, postId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const post = await getSharedBoardPostById(postId);
  if (!post) notFound();
  if (post.boardSlug !== boardSlug) {
    redirect(`/board/${post.boardSlug}/${postId}`);
  }

  const isAuthor = post.authorUserId === session.user.id;
  const canEditAsAdmin = isAdmin(session);
  if (!isAuthor && !canEditAsAdmin) {
    redirect(`/board/${boardSlug}/${postId}`);
  }

  return (
    <div className="mx-auto min-h-[calc(100svh-3.5rem)] w-full max-w-2xl p-4 sm:p-6">
      <Link
        href={`/board/${encodeURIComponent(boardSlug)}/${postId}`}
        className="mb-4 inline-block min-h-[44px] text-sm text-muted-foreground underline-offset-2 hover:underline"
        suppressHydrationWarning
      >
        ← 글 보기
      </Link>

      <h1 className="mb-4 text-xl font-semibold tracking-tight text-foreground">
        글 수정
      </h1>

      <BoardPostEditForm
        postId={postId}
        boardSlug={boardSlug}
        initialValues={{ title: post.title, body: post.body }}
      />
    </div>
  );
}
