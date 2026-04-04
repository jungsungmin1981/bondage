import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthSession } from "@/lib/server-session";
import { getCachedDmThreadsForUser } from "@/lib/cached-dm-threads";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ list?: string }>;
}) {
  const session = await getAuthSession();
  if (!session) redirect("/login");

  const threads = await getCachedDmThreadsForUser(session.user.id);
  const first = threads[0]?.threadId ?? null;
  const params = await searchParams;
  // list=1 이면 스레드 목록만 보여 주고 리다이렉트하지 않음 (무한 리다이렉트 방지)
  if (first && params?.list !== "1") redirect(`/messages/${encodeURIComponent(first)}`);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-lg font-semibold">쪽지</h1>
      {threads.length > 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          왼쪽 목록에서 대화를 선택해 주세요.
        </p>
      ) : (
        <>
          <p className="mt-6 text-sm text-muted-foreground">
            아직 대화가 없습니다. 리거/버니 프로필에서 쪽지를 시작해 주세요.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            또는 <Link className="underline" href="/rigger">리거 목록</Link>에서
            상대 프로필로 들어가 새 대화를 시작할 수 있습니다.
          </p>
        </>
      )}
    </div>
  );
}

