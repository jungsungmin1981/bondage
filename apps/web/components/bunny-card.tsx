import { SuspensionRemainingTime } from "@/components/suspension-remaining-time";

const JAIL_CARD_URL = "/jail-card.png";

/** 버니 카드: 등급 카드와 동일 크기(280px, 3:4). 이미지 또는 placeholder. */
export function BunnyCard({
  cardImageUrl,
  jailOverlay,
  suspendedUntil,
  objectFit = "cover",
}: {
  cardImageUrl: string | null | undefined;
  /** 계정 사용 제한 시 감옥 이미지 오버레이 */
  jailOverlay?: boolean;
  /** 정지 해제 예정 시각 ISO 문자열. null이면 영구. 상세보기에서만 전달 시 남은 시간 표시 */
  suspendedUntil?: string | null;
  /** 이미지 맞춤 방식. contain이면 비율 유지하며 전부 노출, cover가 기본 */
  objectFit?: "cover" | "contain";
}) {
  const url = cardImageUrl?.trim();
  return (
    <div
      className="relative flex w-full min-w-0 max-w-[280px] flex-col overflow-hidden rounded-xl border-2 border-border bg-muted/30 aspect-[3/4] min-h-[190px] sm:min-h-[210px]"
      aria-label={url ? "버니 카드" : "버니 프로필"}
    >
      {url ? (
        <img
          src={url}
          alt=""
          className={`h-full w-full object-center ${objectFit === "contain" ? "object-contain" : "object-cover"}`}
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-center">
          <span className="text-4xl opacity-50" aria-hidden>
            🐰
          </span>
          <span className="text-sm font-medium text-muted-foreground">
            버니 프로필
          </span>
        </div>
      )}
      {jailOverlay && (
        <>
          <img
            src={JAIL_CARD_URL}
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
            aria-hidden
          />
          {suspendedUntil !== undefined && (
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 pt-8"
              aria-hidden
            >
              <SuspensionRemainingTime suspendedUntil={suspendedUntil ?? null} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
