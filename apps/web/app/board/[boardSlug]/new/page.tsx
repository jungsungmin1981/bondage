import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@workspace/auth";
import { headers } from "next/headers";
import { getSharedBoardBySlug } from "@workspace/db";
import { isAdmin } from "@/lib/admin";
import { BoardPostForm } from "./post-form";

export default async function BoardNewPostPage({
  params,
}: {
  params: Promise<{ boardSlug: string }>;
}) {
  const { boardSlug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const board = await getSharedBoardBySlug(boardSlug);
  if (!board) notFound();

  if (boardSlug === "notice") {
    if (!isAdmin(session)) notFound();
  } else if (boardSlug !== "free" && boardSlug !== "suggestion") {
    notFound();
  }

  const boardName = board.name;

  return (
    <div className="mx-auto min-h-[calc(100svh-3.5rem)] w-full max-w-2xl p-4 sm:p-6">
      <Link
        href={`/board/${encodeURIComponent(boardSlug)}`}
        className="mb-4 inline-block min-h-[44px] text-sm text-muted-foreground underline-offset-2 hover:underline"
        suppressHydrationWarning
      >
        ← {boardName}
      </Link>

      <h1 className="mb-4 text-xl font-semibold tracking-tight text-foreground">
        글쓰기
      </h1>

      <BoardPostForm boardSlug={boardSlug} />
    </div>
  );
}
