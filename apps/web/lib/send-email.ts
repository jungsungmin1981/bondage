import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY ?? "";
const from =
  process.env.RESEND_FROM ?? "Bondage <onboarding@resend.dev>";

/**
 * 이메일 발송 (아이디 찾기 등). RESEND_API_KEY 없으면 no-op.
 */
export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
