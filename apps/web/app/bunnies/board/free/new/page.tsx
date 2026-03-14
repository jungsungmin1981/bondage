import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@workspace/auth";
import { headers } from "next/headers";
import { BunnyBoardPostForm } from "./post-form";

export default async function NewBunnyBoardPostPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  return (
    <div className="mx-auto min-h-[calc(100svh-3.5rem)] w-full max-w-2xl p-4 sm:p-6">
      <Link
        href="/bunnies/board/free"
        className="mb-4 inline-block min-h-[44px] text-sm text-muted-foreground underline-offset-2 hover:underline"
      >
        ← 자유게시판
      </Link>

      <h1 className="mb-4 text-xl font-semibold tracking-tight text-foreground">
        글쓰기
      </h1>

      <BunnyBoardPostForm />
    </div>
  );
}
