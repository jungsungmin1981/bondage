/** 등급카드와 비슷한 비율의 placeholder (버니 프로필 수정 시 왼쪽 영역) */
export function BunnyProfilePlaceholderCard() {
  return (
    <div className="flex w-full max-w-[280px] flex-col gap-1 sm:col-start-1 sm:row-span-2 sm:row-start-1 sm:justify-end">
      <div
        className="relative flex w-full min-w-0 flex-col overflow-hidden rounded-xl border-2 border-muted bg-muted/30"
        style={{ aspectRatio: "3/4", minHeight: "190px" }}
        aria-hidden
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-center">
          <span className="text-4xl opacity-50" aria-hidden>
            🐰
          </span>
          <span className="text-sm font-medium text-muted-foreground">
            버니 프로필
          </span>
        </div>
      </div>
    </div>
  );
}
