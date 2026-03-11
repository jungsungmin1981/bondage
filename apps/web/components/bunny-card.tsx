/** 버니 카드: 등급 카드와 동일 크기(280px, 3:4). 이미지 또는 placeholder. */
export function BunnyCard({
  cardImageUrl,
}: {
  cardImageUrl: string | null | undefined;
}) {
  const url = cardImageUrl?.trim();
  return (
    <div
      className="relative flex w-full min-w-0 max-w-[280px] flex-col overflow-hidden rounded-xl border-2 border-muted bg-muted/30 aspect-[3/4] min-h-[190px] sm:min-h-[210px]"
      aria-label={url ? "버니 카드" : "버니 프로필"}
    >
      {url ? (
        <img
          src={url}
          alt=""
          className="h-full w-full object-cover object-center"
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
    </div>
  );
}
