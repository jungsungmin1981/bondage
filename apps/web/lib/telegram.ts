/**
 * 텔레그램 sendMessage parse_mode=HTML 시 사용자 입력(닉네임 등) 때문에 400 나지 않도록
 */
export function escapeTelegramHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * 텔레그램 알람 유틸
 * TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID 환경변수가 설정된 경우에만 동작.
 * 알람 실패가 본 기능에 영향을 주지 않도록 내부에서 catch 처리함.
 */
export async function sendTelegramNotification(message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) return;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
    }),
    signal: AbortSignal.timeout(12_000),
  }).catch(() => {});
}

/** 한국 시간 문자열 반환 */
export function nowKST(): string {
  return new Date().toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
