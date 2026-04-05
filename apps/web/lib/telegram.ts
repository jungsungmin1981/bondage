/**
 * 텔레그램 sendMessage parse_mode=HTML 시 사용자 입력(닉네임 등) 때문에 400 나지 않도록
 */
export function escapeTelegramHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

type TelegramSendResponse = { ok?: boolean; description?: string };

/**
 * 텔레그램 알람 유틸
 * TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID 환경변수가 설정된 경우에만 동작.
 * - Telegram은 HTTP 200 + `{ ok: false }` 로 에러를 줄 수 있어 본문을 검사함.
 * - 일시적 네트워크/서버리스 타이밍 이슈에 대비해 짧은 백오프로 재시도함.
 * 알람 실패가 본 기능에 영향을 주지 않도록 최종 실패는 삼킴.
 */
export async function sendTelegramNotification(message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatIdRaw = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatIdRaw) return;

  const chatId =
    /^-?\d+$/.test(chatIdRaw) ? Number(chatIdRaw) : chatIdRaw;

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const body = JSON.stringify({
    chat_id: chatId,
    text: message,
    parse_mode: "HTML",
  });

  // after() 백그라운드 + maxDuration(60) 안에 들어오도록 상한 조정 (4×12s + 백오프 ≈ 52s)
  const attempts = 4;
  const timeoutMs = 12_000;
  const backoffMs = [0, 400, 1_200, 2_500];

  for (let i = 0; i < attempts; i++) {
    if (backoffMs[i]! > 0) {
      await sleep(backoffMs[i]!);
    }
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: AbortSignal.timeout(timeoutMs),
      });
      const data = (await res.json().catch(() => null)) as TelegramSendResponse | null;
      if (res.ok && data?.ok === true) {
        return;
      }
    } catch {
      /* 다음 시도 */
    }
  }
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
