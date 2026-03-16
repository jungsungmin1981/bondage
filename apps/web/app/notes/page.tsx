import { headers } from "next/headers";
import { auth } from "@workspace/auth";
import { redirect } from "next/navigation";
import { listInboxDirectMessagesForUserWithSender } from "@workspace/db";
import { NotesListWithModal } from "./notes-list-with-modal";

export default async function NotesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const messages = await listInboxDirectMessagesForUserWithSender(session.user.id);

  const listItems = messages.map((m) => ({
    id: m.id,
    title: m.title,
    body: m.body,
    source: m.source,
    imageUrls: m.imageUrls ?? [],
    classPostLevel: m.classPostLevel ?? null,
    classPostTitle: m.classPostTitle ?? null,
    readAt: m.readAt,
    createdAt: m.createdAt,
  }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <h1 className="text-lg font-semibold sm:text-xl">쪽지 수신함</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        관리자 등에서 보낸 쪽지만 수신할 수 있습니다.
      </p>

      {listItems.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">
          받은 쪽지가 없습니다.
        </p>
      ) : (
        <NotesListWithModal messages={listItems} />
      )}
    </div>
  );
}
