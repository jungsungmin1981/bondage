import { headers } from "next/headers";
import { auth } from "@workspace/auth";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSecretOrFallback } from "@/lib/env-secrets";

function b64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input, "utf8");
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function signWsToken(params: { userId: string; expMs: number }, secret: string) {
  const exp = String(params.expMs);
  const nonce = crypto.randomUUID();
  const payload = `${params.userId}.${exp}.${nonce}`;
  const sig = crypto.createHmac("sha256", secret).update(payload).digest();
  return `${payload}.${b64url(sig)}`;
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }
  const secret = getSecretOrFallback(
    ["WS_TOKEN_SECRET", "BETTER_AUTH_SECRET"],
    "dev-secret",
  );
  const expMs = Date.now() + 5 * 60 * 1000; // 5분
  const token = signWsToken({ userId: session.user.id, expMs }, secret);
  return NextResponse.json({ ok: true, token, expMs });
}

