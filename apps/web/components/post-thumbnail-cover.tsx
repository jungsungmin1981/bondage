/**
 * 피드 썸네일: 모바일 Safari에서 grid 셀 안의 img에 h-full만 주면
 * 셀 높이가 0에 가깝게 잡혀 이미지가 잘리거나 한 줄로 보이는 경우가 있어
 * absolute inset-0으로 영역을 채운다.
 */
export function PostThumbnailCover({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative h-full min-h-0 min-w-0 overflow-hidden bg-muted">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}
