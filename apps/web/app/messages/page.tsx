import { headers } from "next/headers";
import { auth } from "@workspace/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { listThreadsForUser } from "@workspace/db";

export default async function MessagesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const threads = await listThreadsForUser(session.user.id);
  const first = threads[0]?.threadId ?? null;
  if (first) redirect(`/messages/${encodeURIComponent(first)}`);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-lg font-semibold">쪽지</h1>
      <p className="mt-6 text-sm text-muted-foreground">
        아직 대화가 없습니다. 리거/버니 프로필에서 쪽지를 시작해 주세요.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        또는 <Link className="underline" href="/rigger">리거 목록</Link>에서
        상대 프로필로 들어가 새 대화를 시작할 수 있습니다.
      </p>
    </div>
  );
}

