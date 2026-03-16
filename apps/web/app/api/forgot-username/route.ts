import { NextResponse } from "next/server";
import { getUserByEmail } from "@workspace/db";
import { sendEmail } from "@/lib/send-email";

/**
 * 아이디 찾기: 이메일로 요청 시 해당 이메일 가입자의 아이디를 메일로 발송.
 * 존재 여부를 노출하지 않기 위해 항상 200 + { ok: true } 반환.
 */
export async function POST(request: Request) {
  let email = "";
  try {
    const body = (await request.json()) as { email?: string };
    email = typeof body.email === "string" ? body.email.trim() : "";
  } catch {
    return NextResponse.json({ ok: true });
  }
  if (!email) {
    return NextResponse.json({ ok: true });
  }

  const user = await getUserByEmail(email);
  if (user?.username) {
    void sendEmail({
      to: email,
      subject: "Bondage 아이디 안내",
      html: buildForgotUsernameEmailHtml(user.username),
      text: `Bondage 아이디 안내\n\n가입 시 사용한 아이디: ${user.username}\n\n위 아이디를 복사하여 로그인에 사용하세요.`,
    });
  }

  return NextResponse.json({ ok: true });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 아이디 찾기 메일 HTML (인라인 스타일로 이메일 클라이언트 호환) */
function buildForgotUsernameEmailHtml(username: string): string {
  const safeUsername = escapeHtml(username);
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
              <h1 style="margin:0; font-size: 18px; font-weight: 600; color: #0f172a;">Bondage 아이디 안내</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px;">
              <p style="margin:0 0 16px; font-size: 15px; line-height: 1.5; color: #475569;">가입 시 사용한 아이디입니다. 아래 영역을 선택한 뒤 복사하여 로그인에 사용하세요.</p>
              <div style="margin: 20px 0; padding: 16px 20px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 18px; font-weight: 600; color: #0f172a; letter-spacing: 0.02em; user-select: all; -webkit-user-select: all;">
                ${safeUsername}
              </div>
              <p style="margin: 0; font-size: 13px; color: #64748b;">PC: 아이디를 드래그한 뒤 Ctrl+C (Mac: Cmd+C)로 복사</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 24px 28px; border-top: 1px solid #e2e8f0;">
              <p style="margin:0; font-size: 12px; color: #94a3b8;">본인이 요청한 것이 아니라면 이 메일을 무시하세요.</p>
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
