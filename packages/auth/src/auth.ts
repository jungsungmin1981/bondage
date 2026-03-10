import { db, schema } from "@workspace/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { genericOAuth } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";

const kakaoClientId = process.env.KAKAO_CLIENT_ID ?? "";
const kakaoClientSecret = process.env.KAKAO_CLIENT_SECRET ?? "";
const naverClientId = process.env.NAVER_CLIENT_ID ?? "";
const naverClientSecret = process.env.NAVER_CLIENT_SECRET ?? "";
const googleClientId = process.env.GOOGLE_CLIENT_ID ?? "";
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      ...schema,
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
    },
  }),
  emailAndPassword: {
    enabled: true,
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
