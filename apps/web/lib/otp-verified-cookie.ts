import crypto from "crypto";
import { getSecretOrFallback } from "@/lib/env-secrets";

const COOKIE_NAME = "otp_verified";
const EXPIRY_SEC = 12 * 60 * 60; // 12시간

function b64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input, "utf8");
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function getSecret(): string {
  return getSecretOrFallback(
    ["OTP_VERIFIED_COOKIE_SECRET", "BETTER_AUTH_SECRET"],
    "dev-otp-verified-secret",
  );
}

/**
 * OTP 검증 완료 쿠키 값 생성. (API Route에서 Set-Cookie에 사용)
 */
export function createOtpVerifiedCookieValue(userId: string): string {
  const secret = getSecret();
  const exp = Math.floor(Date.now() / 1000) + EXPIRY_SEC;
  const payload = `${userId}.${exp}`;
  const sig = crypto.createHmac("sha256", secret).update(payload).digest();
  return `${payload}.${b64url(sig)}`;
}

/**
 * 쿠키 값 검증. userId가 일치하고 만료 전이면 true.
 */
export function verifyOtpVerifiedCookie(
  value: string | undefined,
  userId: string,
): boolean {
  if (!value || typeof value !== "string") return false;
  const secret = getSecret();
  const parts = value.split(".");
  if (parts.length !== 3) return false;
  const payloadUserId = parts[0];
  const expStr = parts[1];
  const sigB64 = parts[2];
  if (!payloadUserId || !expStr || !sigB64) return false;
  if (payloadUserId !== userId) return false;
  const exp = parseInt(expStr, 10);
  if (!Number.isFinite(exp) || Date.now() / 1000 > exp) return false;
  const payload = `${payloadUserId}.${expStr}`;
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest();
  const sigB64Normalized = sigB64.replace(/-/g, "+").replace(/_/g, "/");
  const sig = Buffer.from(sigB64Normalized, "base64");
  if (sig.length !== expectedSig.length) return false;
  return crypto.timingSafeEqual(sig, expectedSig);
}

export const OTP_VERIFIED_COOKIE_NAME = COOKIE_NAME;
export const OTP_VERIFIED_COOKIE_MAX_AGE = EXPIRY_SEC;
