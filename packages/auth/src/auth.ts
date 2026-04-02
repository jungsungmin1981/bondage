import { db, schema, eq, and, gt, isNull, lt, sql } from "@workspace/db";
import { betterAuth } from "better-auth";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { genericOAuth, username } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { Resend } from "resend";

const kakaoClientId = process.env.KAKAO_CLIENT_ID ?? "";
const kakaoClientSecret = process.env.KAKAO_CLIENT_SECRET ?? "";
const naverClientId = process.env.NAVER_CLIENT_ID ?? "";
const naverClientSecret = process.env.NAVER_CLIENT_SECRET ?? "";
const googleClientId = process.env.GOOGLE_CLIENT_ID ?? "";
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";

const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const extraOrigins = process.env.BETTER_AUTH_TRUSTED_ORIGINS
  ? process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
  : [];

/** baseURL에서 www 유무 변형 도메인을 자동으로 신뢰 origin에 추가 */
function deriveAutoOrigins(base: string): string[] {
  try {
    const { protocol, hostname } = new URL(base);
    if (!hostname || hostname === "localhost") return [];
    const alt = hostname.startsWith("www.")
      ? `${protocol}//${hostname.slice(4)}`
      : `${protocol}//www.${hostname}`;
    return [alt];
  } catch {
    return [];
  }
}

const resendApiKey = process.env.RESEND_API_KEY ?? "";
const resendFrom =
  process.env.RESEND_FROM ?? "Bondage <onboarding@resend.dev>";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 비밀번호 재설정 메일 HTML */
function buildResetPasswordEmailHtml(resetUrl: string): string {
  const safeUrl = escapeHtml(resetUrl);
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f1f5f9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 420px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
          <tr>
            <td style="padding: 28px 24px 20px; border-bottom: 1px solid #e2e8f0;">
              <h1 style="margin:0; font-size: 18px; font-weight: 600; color: #0f172a;">Bondage 비밀번호 재설정</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px;">
              <p style="margin:0 0 20px; font-size: 15px; line-height: 1.5; color: #475569;">비밀번호 재설정을 요청하셨습니다. 아래 버튼을 클릭하면 새 비밀번호를 설정할 수 있습니다.</p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
                <tr>
                  <td style="border-radius: 8px; background-color: #2563eb;">
                    <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none;">비밀번호 재설정하기</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 8px; font-size: 13px; color: #64748b;">버튼이 동작하지 않으면 아래 링크를 복사해 브라우저에 붙여넣으세요.</p>
              <p style="margin: 0; font-size: 12px; word-break: break-all; color: #94a3b8;">${safeUrl}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 24px 28px; border-top: 1px solid #e2e8f0;">
              <p style="margin:0; font-size: 12px; color: #94a3b8;">본인이 요청한 것이 아니라면 이 메일을 무시하세요. 링크는 일정 시간이 지나면 만료됩니다.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/** 이메일 인증 메일 HTML */
function buildVerificationEmailHtml(verificationUrl: string): string {
  const safeUrl = escapeHtml(verificationUrl);
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f1f5f9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 420px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
          <tr>
            <td style="padding: 28px 24px 20px; border-bottom: 1px solid #e2e8f0;">
              <h1 style="margin:0; font-size: 18px; font-weight: 600; color: #0f172a;">Bondage 이메일 인증</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px;">
              <p style="margin:0 0 20px; font-size: 15px; line-height: 1.5; color: #475569;">회원가입을 완료하려면 아래 버튼을 클릭해 이메일 인증을 완료해 주세요.</p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
                <tr>
                  <td style="border-radius: 8px; background-color: #2563eb;">
                    <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none;">이메일 인증하기</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 8px; font-size: 13px; color: #64748b;">버튼이 동작하지 않으면 아래 링크를 복사해 브라우저에 붙여넣으세요.</p>
              <p style="margin: 0; font-size: 12px; word-break: break-all; color: #94a3b8;">${safeUrl}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 24px 28px; border-top: 1px solid #e2e8f0;">
              <p style="margin:0; font-size: 12px; color: #94a3b8;">본인이 가입한 것이 아니라면 이 메일을 무시하세요. 링크는 일정 시간이 지나면 만료됩니다.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/** 요청 단계에서 인증키 검증 후 유효하면 row 반환, 아니면 APIError throw */
async function validateInviteKey(key: string): Promise<{ id: string }> {
  const now = new Date();
  const [row] = await db
    .select()
    .from(schema.inviteKeys)
    .where(
      and(
        eq(schema.inviteKeys.key, key),
        gt(schema.inviteKeys.expiresAt, now),
        // maxUses가 설정된 키: usedCount < maxUses (재사용 가능)
        // maxUses가 null인 키: 기존 1회용 방식 (usedAt IS NULL)
        sql`(
          (${schema.inviteKeys.maxUses} IS NOT NULL AND ${schema.inviteKeys.usedCount} < ${schema.inviteKeys.maxUses})
          OR
          (${schema.inviteKeys.maxUses} IS NULL AND ${schema.inviteKeys.usedAt} IS NULL)
        )`,
      ),
    )
    .limit(1);
  if (row) return { id: row.id };

  // 오류 원인 파악
  const [found] = await db
    .select({ id: schema.inviteKeys.id, usedAt: schema.inviteKeys.usedAt, maxUses: schema.inviteKeys.maxUses, usedCount: schema.inviteKeys.usedCount, expiresAt: schema.inviteKeys.expiresAt })
    .from(schema.inviteKeys)
    .where(eq(schema.inviteKeys.key, key))
    .limit(1);
  if (found) {
    if (found.expiresAt <= now) {
      throw new APIError("BAD_REQUEST", { message: "INVITE_KEY_EXPIRED" });
    }
    if (found.maxUses != null && found.usedCount >= found.maxUses) {
      throw new APIError("BAD_REQUEST", { message: "INVITE_KEY_ALREADY_USED" });
    }
    if (found.maxUses == null && found.usedAt) {
      throw new APIError("BAD_REQUEST", { message: "INVITE_KEY_ALREADY_USED" });
    }
  }
  throw new APIError("BAD_REQUEST", { message: "INVITE_KEY_INVALID" });
}

export const auth = betterAuth({
  baseURL,
  trustedOrigins: [baseURL, ...deriveAutoOrigins(baseURL), ...extraOrigins],
  advanced: {
    /**
     * 일부 모바일 브라우저·인앱 브라우저는 쿠키 보유 상태에서 Origin 헤더를 누락하거나
     * "null"로 전송하여 두 번째 로그인부터 FORBIDDEN 오류가 발생할 수 있음.
     * CSRF 체크 대신 trustedOrigins 검증만 유지한다.
     */
    disableCSRFCheck: true,
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5분 동안 DB 조회 없이 쿠키에서 세션 읽기
    },
  },
  user: {
    additionalFields: {
      memberType: {
        type: "string",
        required: false,
        input: false,
        fieldName: "member_type",
      },
      /** after 훅에서 설정. user 스키마에는 invite_key_id만 있음 */
      inviteKeyId: {
        type: "string",
        required: false,
        input: false,
        fieldName: "invite_key_id",
      },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (!ctx.path.includes("sign-up/email")) return;
      const body = ctx.body as Record<string, unknown> | undefined;      const normalizedUsername =
        typeof body?.username === "string" ? body.username.trim().toLowerCase() : body?.username;
      const bodyWithUsername = { ...body, username: normalizedUsername };

      const key = typeof body?.inviteKey === "string" ? body.inviteKey.trim() : "";
      if (!key) {
        throw new APIError("BAD_REQUEST", { message: "INVITE_KEY_REQUIRED" });
      }
      /** env ADMIN_INVITE_KEY와 일치하면 DB 인증키 없이 관리자(운영진)로 가입. 그 키로 등록한 사람만 관리자 등록. */
      const adminInviteKey = process.env.ADMIN_INVITE_KEY?.trim();
      if (adminInviteKey && key === adminInviteKey) {
        const { inviteKey: _drop, ...bodyWithoutKey } = bodyWithUsername as Record<string, unknown>;
        const bodyWithAdminFlag = { ...bodyWithoutKey, __adminInviteKey: true };
        return {
          context: {
            ...ctx,
            body: bodyWithAdminFlag,
            __adminInviteKey: true,
          },
        };
      }
      const row = await validateInviteKey(key);
      const { inviteKey: _drop, ...bodyWithoutKey } = bodyWithUsername as Record<string, unknown>;
      // body에 넣어 after 훅에서 확실히 읽을 수 있게 함 (context는 프레임워크가 덮을 수 있음)
      const bodyWithInviteKeyId = { ...bodyWithoutKey, __inviteKeyId: row.id };
      return {
        context: {
          ...ctx,
          body: bodyWithInviteKeyId,
          __inviteKeyId: row.id,
        },
      };
    }),
    after: createAuthMiddleware(async (ctx) => {
      // ── 운영진·관리자 로그인 알람 ─────────────────────────────────────────────
      const isEmailSignIn = ctx.path.includes("sign-in/email");
      const isUsernameSignIn = ctx.path.includes("sign-in/username");
      if (isEmailSignIn || isUsernameSignIn) {
        try {
          const body = ctx.body as Record<string, unknown> | undefined;
          const adminEmail = process.env.ADMIN_EMAIL?.trim() ?? "";
          const adminUsername = process.env.ADMIN_USERNAME?.trim() ?? "";

          let user: { id: string; memberType: string | null; username: string | null; email: string } | undefined;

          if (isUsernameSignIn) {
            const loginUsername = typeof body?.username === "string" ? body.username.trim() : "";
            if (loginUsername) {
              const [row] = await db
                .select({ id: schema.users.id, memberType: schema.users.memberType, username: schema.users.username, email: schema.users.email })
                .from(schema.users)
                .where(eq(schema.users.username, loginUsername))
                .limit(1);
              user = row;
            }
          } else {
            const loginEmail = typeof body?.email === "string" ? body.email.trim() : "";
            if (loginEmail) {
              const [row] = await db
                .select({ id: schema.users.id, memberType: schema.users.memberType, username: schema.users.username, email: schema.users.email })
                .from(schema.users)
                .where(eq(schema.users.email, loginEmail))
                .limit(1);
              user = row;
            }
          }

          if (user) {
            const isPrimaryAdminUser =
              (adminEmail.length > 0 && user.email === adminEmail) ||
              (adminUsername.length > 0 && user.username === adminUsername);
            const isOperator = user.memberType === "operator";

            if (isPrimaryAdminUser || isOperator) {
              const [profile] = await db
                .select({ nickname: schema.memberProfiles.nickname })
                .from(schema.memberProfiles)
                .where(eq(schema.memberProfiles.userId, user.id))
                .limit(1);
              const token = process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
              const chatId = process.env.TELEGRAM_CHAT_ID?.trim() ?? "";
              if (token && chatId) {
                const now = new Date().toLocaleString("ko-KR", {
                  timeZone: "Asia/Seoul",
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const nickname = profile?.nickname ?? user.username ?? user.email;
                const label = isPrimaryAdminUser ? "관리자" : "운영진";
                const message = `🔐 <b>${label} 로그인</b>\n닉네임: ${nickname}\n시간: ${now}`;
                void fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" }),
                }).catch(() => {});
              }
            }
          }
        } catch {
          // 알람 실패가 로그인에 영향 없도록
        }
        return;
      }

      // ── 회원가입 후처리 ───────────────────────────────────────────────────
      if (!ctx.path.includes("sign-up/email")) return;
      const c = ctx.context as Record<string, unknown> | undefined;
      const body = (ctx.body ?? c?.body) as Record<string, unknown> | undefined;
      let inviteKeyId = (c?.__inviteKeyId ?? body?.__inviteKeyId) as string | undefined;
      if (!inviteKeyId && typeof body?.inviteKey === "string") {
        try {
          const row = await validateInviteKey(body.inviteKey.trim());
          inviteKeyId = row.id;
        } catch {
          inviteKeyId = undefined;
        }
      }
      let userId: string | undefined;
      if (body) {
        const email = typeof body.email === "string" ? body.email.trim() : "";
        if (email) {
          const [row] = await db
            .select({ id: schema.users.id })
            .from(schema.users)
            .where(eq(schema.users.email, email))
            .limit(1);
          userId = row?.id;
        }
      }
      if (!userId) return;
      const isAdminInviteKey = !!(c?.__adminInviteKey ?? body?.__adminInviteKey);
      if (isAdminInviteKey) {
        await db
          .update(schema.users)
          .set({ memberType: "operator" })
          .where(eq(schema.users.id, userId));
        const nickname =
          (typeof body?.username === "string" && body.username.trim()) ||
          (typeof body?.email === "string" && body.email.trim().slice(0, 50)) ||
          "관리자";
        const profileId = crypto.randomUUID();
        const now = new Date();
        await db.insert(schema.memberProfiles).values({
          id: profileId,
          userId,
          memberType: "operator",
          nickname: nickname.slice(0, 200),
          status: "approved",
          updatedAt: now,
        });
      } else if (inviteKeyId) {
        const [keyRow] = await db
          .select({ memberType: schema.inviteKeys.memberType, riggerId: schema.inviteKeys.riggerId })
          .from(schema.inviteKeys)
          .where(eq(schema.inviteKeys.id, inviteKeyId))
          .limit(1);
        const memberType =
          keyRow?.memberType === "rigger" ||
          keyRow?.memberType === "bunny" ||
          keyRow?.memberType === "operator"
            ? keyRow.memberType
            : undefined;
        await db
          .update(schema.users)
          .set({
            inviteKeyId,
            ...(memberType && { memberType }),
          })
          .where(eq(schema.users.id, userId));

        // maxUses가 설정된 키는 usedCount 증가, 1회용 키는 usedAt 기록
        const [keyMeta] = await db
          .select({ maxUses: schema.inviteKeys.maxUses })
          .from(schema.inviteKeys)
          .where(eq(schema.inviteKeys.id, inviteKeyId))
          .limit(1);
        if (keyMeta?.maxUses != null) {
          await db
            .update(schema.inviteKeys)
            .set({ usedCount: sql`${schema.inviteKeys.usedCount} + 1` })
            .where(eq(schema.inviteKeys.id, inviteKeyId));
        } else {
          await db
            .update(schema.inviteKeys)
            .set({ usedAt: new Date(), usedCount: sql`${schema.inviteKeys.usedCount} + 1` })
            .where(eq(schema.inviteKeys.id, inviteKeyId));
        }

        // operator 인증키로 가입한 경우 member_profiles에 pending 프로필 자동 생성
        if (memberType === "operator") {
          const nickname =
            (typeof body?.username === "string" && body.username.trim()) ||
            (typeof body?.email === "string" && body.email.trim().slice(0, 50)) ||
            "운영진";
          const profileId = crypto.randomUUID();
          const now = new Date();
          await db.insert(schema.memberProfiles).values({
            id: profileId,
            userId,
            memberType: "operator",
            nickname: nickname.slice(0, 200),
            status: "pending",
            updatedAt: now,
          });
        }
      }
      // 메일 미연결 시 가입한 사용자는 자동 인증 처리. 나중에 메일 연결 후 requireEmailVerification 켜도 기존 사용자는 로그인 가능
      if (!resendApiKey) {
        await db
          .update(schema.users)
          .set({ emailVerified: true })
          .where(eq(schema.users.id, userId));
      }
    }),
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      ...schema,
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verification,
    },
  }),
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 3600, // 1시간
    sendVerificationEmail: async ({ user, url }) => {
      if (!resendApiKey) {
        console.warn("[Better Auth] 이메일 인증 메일 미발송: RESEND_API_KEY가 설정되지 않았습니다.");
        return;
      }
      const resend = new Resend(resendApiKey);
      const html = buildVerificationEmailHtml(url);
      try {
        const result = await resend.emails.send({
          from: resendFrom,
          to: user.email,
          subject: "Bondage 이메일 인증",
          html,
        });
        if (result.error) {
          console.error("[Better Auth] 이메일 인증 메일 발송 실패:", result.error);
        }
      } catch (e) {
        console.error("[Better Auth] 이메일 인증 메일 발송 예외:", e);
      }
    },
  },
  emailAndPassword: {
    enabled: true,
    /** 이메일 인증 비활성화 (정식 오픈 시 true로 변경) */
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      if (!resendApiKey) {
        console.warn("[Better Auth] 비밀번호 재설정 메일 미발송: RESEND_API_KEY가 설정되지 않았습니다.");
        return;
      }
      const resend = new Resend(resendApiKey);
      const html = buildResetPasswordEmailHtml(url);
      try {
        const result = await resend.emails.send({
          from: resendFrom,
          to: user.email,
          subject: "Bondage 비밀번호 재설정",
          html,
        });
        if (result.error) {
          console.error("[Better Auth] 비밀번호 재설정 메일 발송 실패:", result.error);
        }
      } catch (e) {
        console.error("[Better Auth] 비밀번호 재설정 메일 발송 예외:", e);
      }
    },
  },
  socialProviders: {
    ...(googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        }
      : {}),
  },
  plugins: [
    nextCookies(),
    username({
      usernameValidator: (id) => /^[a-zA-Z0-9]+$/.test(id),
    }),
    ...((kakaoClientId && kakaoClientSecret) || (naverClientId && naverClientSecret)
      ? [
          genericOAuth({
            config: [
              ...(kakaoClientId && kakaoClientSecret
                ? [
                    {
                      providerId: "kakao",
                      clientId: kakaoClientId,
                      clientSecret: kakaoClientSecret,
                authorizationUrl: "https://kauth.kakao.com/oauth/authorize",
                tokenUrl: "https://kauth.kakao.com/oauth/token",
                userInfoUrl: "https://kapi.kakao.com/v2/user/me",
                scopes: ["profile_nickname", "profile_image", "account_email"],
                getUserInfo: async (tokens: { accessToken?: string }) => {
                  const res = await fetch("https://kapi.kakao.com/v2/user/me", {
                    headers: {
                      Authorization: `Bearer ${tokens.accessToken ?? ""}`,
                    },
                  });
                  if (!res.ok) return null;
                  const data = (await res.json()) as {
                    id: number;
                    kakao_account?: {
                      email?: string;
                      profile?: {
                        nickname?: string;
                        profile_image_url?: string;
                        thumbnail_image_url?: string;
                      };
                    };
                    properties?: {
                      nickname?: string;
                      profile_image?: string;
                      thumbnail_image?: string;
                    };
                  };
                  const id = String(data.id);
                  const profile = data.kakao_account?.profile;
                  const name =
                    profile?.nickname ??
                    data.properties?.nickname ??
                    undefined;
                  const image =
                    profile?.profile_image_url ??
                    profile?.thumbnail_image_url ??
                    data.properties?.profile_image ??
                    data.properties?.thumbnail_image ??
                    undefined;
                  const email =
                    data.kakao_account?.email ?? `kakao_${id}@kakao.placeholder`;
                  return {
                    id,
                    name: name ?? undefined,
                    email,
                    image: image ?? undefined,
                    emailVerified: !!data.kakao_account?.email,
                  };
                },
              },
            ]
                : []),
              ...(naverClientId && naverClientSecret
                ? [
                    {
                      providerId: "naver",
                      clientId: naverClientId,
                      clientSecret: naverClientSecret,
                      authorizationUrl: "https://nid.naver.com/oauth2.0/authorize",
                      tokenUrl: "https://nid.naver.com/oauth2.0/token",
                      userInfoUrl: "https://openapi.naver.com/v1/nid/me",
                      scopes: ["name", "email", "profile_image"],
                      getUserInfo: async (tokens: { accessToken?: string }) => {
                        const res = await fetch(
                          "https://openapi.naver.com/v1/nid/me",
                          {
                            headers: {
                              Authorization: `Bearer ${tokens.accessToken ?? ""}`,
                            },
                          },
                        );
                        if (!res.ok) return null;
                        const data = (await res.json()) as {
                          resultcode?: string;
                          response?: {
                            id?: string;
                            email?: string;
                            nickname?: string;
                            name?: string;
                            profile_image?: string;
                          };
                        };
                        if (data.resultcode !== "00" || !data.response)
                          return null;
                        const r = data.response;
                        const id = r.id ?? "";
                        const email =
                          r.email ?? `naver_${id}@naver.placeholder`;
                        return {
                          id,
                          name: r.name ?? r.nickname ?? undefined,
                          email,
                          image: r.profile_image ?? undefined,
                          emailVerified: !!r.email,
                        };
                      },
                    },
                  ]
                : []),
            ],
          }),
        ]
      : []),
  ],
});
