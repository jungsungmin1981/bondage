import { headers } from "next/headers";
import { auth } from "@workspace/auth";
import { redirect } from "next/navigation";
import { getThreadMessages, listThreadsForUser, markThreadRead, getRiggerProfileById } from "@workspace/db";
import { ThreadView } from "../thread-view";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const { threadId } = await params;
  const decoded = decodeURIComponent(threadId);
  let messages;
  try {
    messages = await getThreadMessages(decoded, session.user.id, 50);
    await markThreadRead(decoded, session.user.id);
  } catch {
    // 참여자가 아닌 thread에 접근한 경우 등 — list=1 로 보내서 첫 스레드로 다시 리다이렉트되지 않게 함
    redirect("/messages?list=1");
  }

  // 상단 헤더용 상대 정보 (닉네임, 마크 이미지)
  const threads = await listThreadsForUser(session.user.id);
  const meta = threads.find((t) => t.threadId === decoded);

  let otherMarkImageUrl: string | null = null;
  if (meta?.otherProfileId && meta.otherMemberType === "rigger") {
    try {
      const profile = await getRiggerProfileById(meta.otherProfileId);
      otherMarkImageUrl = profile?.markImageUrl?.trim() || null;
    } catch {
      otherMarkImageUrl = null;
    }
  } else if (meta?.otherMemberType === "bunny") {
    otherMarkImageUrl = meta?.otherCardImageUrl?.trim() || "/default-bunny-card.png";
  }

  return (
    <ThreadView
      threadId={decoded}
      sessionUserId={session.user.id}
      initialMessages={messages}
      otherNickname={meta?.otherNickname ?? null}
      otherMarkImageUrl={otherMarkImageUrl}
      otherProfileId={meta?.otherProfileId ?? null}
      otherMemberType={meta?.otherMemberType ?? null}
    />
  );
}

