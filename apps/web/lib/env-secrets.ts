/**
 * production에서는 env가 없을 때 "dev-secret" 등 fallback 사용 금지.
 * 개발 환경에서만 fallback 허용.
 */
export function getSecretOrFallback(
  envKeys: string[],
  devFallback: string,
): string {
  for (const key of envKeys) {
    const v = process.env[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      `${envKeys.join(" or ")} must be set in production. Do not rely on dev fallback.`,
    );
  }
  return devFallback;
}
