"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@workspace/auth";
import { approveRiggerProfile as dbApproveRiggerProfile } from "@workspace/db";
import { isAdmin } from "@/lib/admin";

export async function approveRiggerProfileAction(profileId: string): Promise<
  | { ok: true }
  | { ok: false; error: string }
> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!isAdmin(session)) {
    return { ok: false, error: "관리자만 승인할 수 있습니다." };
  }
  const result = await dbApproveRiggerProfile(profileId);
  if (result.ok) {
    revalidatePath("/admin/riggers");
  }
  return result;
}
