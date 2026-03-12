"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@workspace/auth";
import {
  createClassPost,
  deleteClassPost,
  listClassPostsByLevel,
  updateClassPost,
  type ClassLevel,
  type ClassVisibility,
} from "@workspace/db";
import { isAdmin } from "@/lib/admin";

export type ClassPostForAdmin = Awaited<
  ReturnType<typeof listClassPostsByLevel>
>[number];

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!isAdmin(session)) throw new Error("관리자만 사용할 수 있습니다.");
  return session;
}

export async function listClassPostsAction(level: ClassLevel) {
  await requireAdmin();
  return listClassPostsByLevel(level, { includePrivate: true });
}

export async function createClassPostAction(input: {
  id: string;
  level: ClassLevel;
  visibility: ClassVisibility;
  title: string;
  description: string;
  ropeThicknessMm: number;
  ropeLengthM: number;
  quantity: number;
  coverImageUrl: string;
  extraImageUrls: string[];
  videoUrl?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    await createClassPost(input);
    revalidatePath(`/admin/class/${input.level}`);
    revalidatePath(`/class/${input.level}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "저장에 실패했습니다." };
  }
}

export async function updateClassPostAction(input: {
  id: string;
  visibility: ClassVisibility;
  title: string;
  description: string;
  ropeThicknessMm: number;
  ropeLengthM: number;
  quantity: number;
  coverImageUrl: string;
  extraImageUrls: string[];
  videoUrl?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    await updateClassPost(input.id, input);
    revalidatePath(`/admin/class`);
    revalidatePath(`/class/beginner`);
    revalidatePath(`/class/intermediate`);
    revalidatePath(`/class/advanced`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "저장에 실패했습니다." };
  }
}

export async function deleteClassPostAction(id: string): Promise<
  { ok: true } | { ok: false; error: string }
> {
  try {
    await requireAdmin();
    await deleteClassPost(id);
    revalidatePath(`/admin/class`);
    revalidatePath(`/class/beginner`);
    revalidatePath(`/class/intermediate`);
    revalidatePath(`/class/advanced`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "삭제에 실패했습니다." };
  }
}

