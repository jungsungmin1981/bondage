import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@workspace/auth";
import { headers } from "next/headers";
import { getBunnyBoardPostById } from "@workspace/db";
import { BunnyBoardPostEditForm } from "./edit-form";

export default async function EditBunnyBoardPostPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const post = await getBunnyBoardPostById(postId);
  if (!post) notFound();
  if (post.authorUserId !== session.user.id) {
    redirect(`/bunnies/board/free/${postId}`);
  }
  if (post.boardSlug !== "free") {
    redirect(`/bunnies/board/${post.boardSlug}/${postId}`);
  }

  return (
    <div className="mx-auto min-h-[calc(100svh-3.5rem)] w-full max-w-2xl p-4 sm:p-6">
      <Link
        href={`/bunnies/board/free/${postId}`}
        className="mb-4 inline-block min-h-[44px] text-sm text-muted-foreground underline-offset-2 hover:underline"
      >
        ← 글 보기
      </Link>

      <h1 className="mb-4 text-xl font-semibold tracking-tight text-foreground">
        글 수정
      </h1>

      <BunnyBoardPostEditForm
        postId={postId}
        initialValues={{ title: post.title, body: post.body }}
      />
    </div>
  );
}
