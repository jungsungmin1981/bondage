import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/server-session";
import { ensureOneToOneThread, getUserIdByMemberProfileId } from "@workspace/db";

export default async function NewMessagePage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>;
}) {
  const session = await getAuthSession();
  if (!session) redirect("/login");

  const { to } = await searchParams;
  if (!to || typeof to !== "string") redirect("/messages");

  // 기존 링크가 member_profiles.id(프로필 id)를 넘기는 경우가 있어 userId로 변환 시도
  const otherUserId = (await getUserIdByMemberProfileId(to)) ?? to;

  if (otherUserId === session.user.id) {
    redirect("/messages");
  }

  const threadId = await ensureOneToOneThread(session.user.id, otherUserId);
  redirect(`/messages/${encodeURIComponent(threadId)}`);
}

