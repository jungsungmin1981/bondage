"use server";

import { headers } from "next/headers";
import { revalidatePath, revalidateTag } from "next/cache";
import { auth } from "@workspace/auth";
import {
  deleteDirectMessage,
  markDirectMessageAsRead,
} from "@workspace/db";

export async function deleteNoteAction(
  messageId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "로그인이 필요합니다." };

  const deleted = await deleteDirectMessage(messageId, session.user.id);
  if (!deleted) return { ok: false, error: "쪽지를 찾을 수 없거나 삭제할 수 없습니다." };

  revalidateTag(`unread-${session.user.id}`);
  revalidatePath("/notes");
  return { ok: true };
}

export async function markNoteAsReadAction(
  messageId: string,
): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return;

  await markDirectMessageAsRead(messageId, session.user.id);
  revalidateTag(`unread-${session.user.id}`);
  revalidatePath("/notes");
}
