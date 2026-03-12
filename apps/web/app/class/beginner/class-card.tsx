import Image from "next/image";
import { Clock } from "lucide-react";
import type { ClassCard as ClassCardType } from "./data";

const isOptimizableUrl = (url: string) =>
  url.startsWith("https://") || url.startsWith("http://");

export function ClassCard({
  card,
  levelLabel = "초급",
  onImageClick,
}: {
  card: ClassCardType;
  levelLabel?: string;
  onImageClick?: () => void;
}) {
  const hasImage = card.imageUrl?.trim();
  const extraImages = (card.extraImageUrls ?? []).filter((u) => u?.trim());

  return (
    <article
      className="flex overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      aria-labelledby={`class-card-title-${card.id}`}
    >
      {/* 왼쪽: 상품 이미지 영역 (레이아웃에 맞춤) */}
      <div className="relative flex aspect-square w-40 shrink-0 overflow-hidden sm:w-48 md:w-56">
        {card.hasMyChallenge && (
          <span
            className="pointer-events-none absolute left-1.5 top-1.5 z-10 flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/95 px-2 py-0.5 text-[11px] font-semibold text-black shadow-sm dark:border-amber-400/40 dark:bg-amber-400 dark:text-black"
            aria-hidden
          >
            <Clock className="h-3 w-3" strokeWidth={2} />
            심사중
          </span>
        )}
        {hasImage ? (
          onImageClick ? (
            <button
              type="button"
              onClick={onImageClick}
              className="relative block h-full w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="이미지 상세 보기"
            >
              {isOptimizableUrl(card.imageUrl!) ? (
                <Image
                  src={card.imageUrl!}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 160px, (max-width: 768px) 192px, 224px"
                />
              ) : (
                <img src={card.imageUrl!} alt="" className="size-full object-cover" />
              )}
            </button>
          ) : (
            <>
              {isOptimizableUrl(card.imageUrl!) ? (
                <Image
                  src={card.imageUrl!}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 160px, (max-width: 768px) 192px, 224px"
                />
              ) : (
                <img src={card.imageUrl!} alt="" className="size-full object-cover" />
              )}
            </>
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted/30 text-muted-foreground">
            <span className="text-sm">이미지</span>
          </div>
        )}
      </div>

      {/* 오른쪽: 레벨 · 제목 · 로프 스펙 · 설명 · 추가 이미지 */}
      <div className="flex min-w-0 flex-1 flex-col justify-between px-4 py-4 sm:px-5 sm:py-5">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            [{levelLabel} 클래스]
          </p>
          <h2
            id={`class-card-title-${card.id}`}
            className="text-base font-semibold leading-snug text-foreground sm:text-lg"
          >
            {card.title}
          </h2>
          <div className="mt-2 flex flex-wrap items-baseline gap-2">
            {card.ropeThicknessMm != null &&
              card.ropeLengthM != null &&
              card.quantity != null && (
                <span className="inline-flex flex-wrap items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground">
                  <span className="font-medium">두께</span>
                  <span className="font-semibold">{card.ropeThicknessMm}mm</span>
                  <span className="text-foreground/70">·</span>
                  <span className="font-medium">길이</span>
                  <span className="font-semibold">{card.ropeLengthM}m</span>
                  <span className="text-foreground/70">·</span>
                  <span className="font-medium">수량</span>
                  <span className="font-semibold">{card.quantity}개</span>
                </span>
              )}
          </div>
          {card.description?.trim() && (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
              {card.description}
            </p>
          )}
          {extraImages.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <div className="grid grid-cols-5 gap-1.5">
                {extraImages.slice(0, 5).map((url) => (
                  <div
                    key={url}
                    className="relative h-10 w-10 overflow-hidden rounded-md border border-border bg-muted/20"
                  >
                    {isOptimizableUrl(url) ? (
                      <Image
                        src={url}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    ) : (
                      <img src={url} alt="" className="size-full object-cover" />
                    )}
                  </div>
                ))}
              </div>
              {extraImages.length > 5 && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  +{extraImages.length - 5}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
