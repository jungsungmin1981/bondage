"use server";

import { auth } from "@workspace/auth";
import { headers } from "next/headers";

export async function requestPasswordResetAction(
  email: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const baseURL =
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

  const redirectTo = `${baseURL}/reset-password`;

  try {
    const response = await auth.api.forgetPassword({
      body: { email, redirectTo },
      headers: await headers(),
    });
    if (!response) return { ok: true };
    return { ok: true };
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "요청에 실패했습니다.";
    console.error("[requestPasswordReset] error:", e);
    return { ok: false, error: message };
  }
}
