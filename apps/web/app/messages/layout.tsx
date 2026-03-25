import type { ReactNode } from "react";
import { headers } from "next/headers";
import { auth } from "@workspace/auth";
import { redirect } from "next/navigation";
import { listThreadsForUser } from "@workspace/db";
import {
  getBunnyDefaultCardUrl,
  resolveBunnyCardUrl,
} from "@/lib/bunny-default-card-config";
import { ThreadList } from "./thread-list";

export default async function MessagesLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const baseThreads = await listThreadsForUser(session.user.id);
  const threads = baseThreads.map((t) => {
    if (t.otherMemberType === "rigger") {
      const mark = t.otherMarkImageUrl?.trim() || "/default-rigger-mark.png";
      return { ...t, otherMarkImageUrl: mark };
    }
    if (t.otherMemberType === "bunny") {
      const mark = resolveBunnyCardUrl(t.otherCardImageUrl) ?? getBunnyDefaultCardUrl();
      return { ...t, otherMarkImageUrl: mark };
    }
    return t;
  });

  return (
    <div className="mx-auto grid max-w-6xl gap-0 py-4 md:grid-cols-[minmax(0,360px)_1fr]">
      <aside className="border-b md:border-b-0 md:border-r">
        <ThreadList threads={threads} />
      </aside>
      <section className="min-h-[calc(100dvh-7rem)]">{children}</section>
    </div>
  );
}

