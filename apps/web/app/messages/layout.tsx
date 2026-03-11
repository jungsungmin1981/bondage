import type { ReactNode } from "react";
import { headers } from "next/headers";
import { auth } from "@workspace/auth";
import { redirect } from "next/navigation";
import { listThreadsForUser } from "@workspace/db";
import { getRiggerOverride } from "@/lib/rigger-overrides";
import { ThreadList } from "./thread-list";

export default async function MessagesLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const baseThreads = await listThreadsForUser(session.user.id);
  const threads = await Promise.all(
    baseThreads.map(async (t) => {
      // 상대가 리거면: 리거 마크(override.markImageUrl)
      if (t.otherProfileId && t.otherMemberType === "rigger") {
        try {
          const override = await getRiggerOverride(t.otherProfileId);
          const mark = override?.markImageUrl?.trim() || null;
          return { ...t, otherMarkImageUrl: mark };
        } catch {
          return { ...t, otherMarkImageUrl: null as string | null };
        }
      }

      // 상대가 버니면: 버니 카드 이미지(cardImageUrl) 또는 기본 이미지
      if (t.otherMemberType === "bunny") {
        const mark = t.otherCardImageUrl?.trim() || "/default-bunny-card.png";
        return { ...t, otherMarkImageUrl: mark };
      }

      // 그 외: 마크 없음
      return { ...t, otherMarkImageUrl: null as string | null };
    }),
  );

  return (
    <div className="mx-auto grid max-w-6xl gap-0 py-4 md:grid-cols-[minmax(0,360px)_1fr]">
      <aside className="border-b md:border-b-0 md:border-r">
        <ThreadList threads={threads} />
      </aside>
      <section className="min-h-[calc(100dvh-7rem)]">{children}</section>
    </div>
  );
}

