import { redirect } from "next/navigation";
import { getThreadMessages, markThreadRead } from "@workspace/db";
import { getAuthSession } from "@/lib/server-session";
import { getCachedDmThreadsForUser } from "@/lib/cached-dm-threads";
import {
  getBunnyDefaultCardUrl,
  resolveBunnyCardUrl,
} from "@/lib/bunny-default-card-config";
import { ThreadView } from "../thread-view";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const session = await getAuthSession();
  if (!session) redirect("/login");

  const { threadId } = await params;
  const decoded = decodeURIComponent(threadId);
  let messages;
  try {
    messages = await getThreadMessages(decoded, session.user.id, 50);
    await markThreadRead(decoded, session.user.id);
  } catch {
    redirect("/messages?list=1");
  }

  // 상단 헤더용 상대 정보 — listThreadsForUser에서 markImageUrl 포함
  const threads = await getCachedDmThreadsForUser(session.user.id);
  const meta = threads.find((t) => t.threadId === decoded);

  let otherMarkImageUrl: string | null = null;
  if (meta?.otherMemberType === "rigger") {
    otherMarkImageUrl = meta.otherMarkImageUrl?.trim() || null;
  } else if (meta?.otherMemberType === "bunny") {
    otherMarkImageUrl =
      resolveBunnyCardUrl(meta.otherCardImageUrl) ?? getBunnyDefaultCardUrl();
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

