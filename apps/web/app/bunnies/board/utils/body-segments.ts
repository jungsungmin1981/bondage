/**
 * 본문을 텍스트/이미지 세그먼트로 파싱·직렬화.
 * 한 흐름 에디터(텍스트-이미지-텍스트)에서 사용.
 */

const IMAGE_REGEX = /!\[[^\]]*\]\(([^)]+)\)/g;

export type BodySegment =
  | { type: "text"; content: string }
  | { type: "image"; url: string };

export function parseBodyToSegments(body: string): BodySegment[] {
  if (!body?.trim()) return [{ type: "text", content: "" }];
  const segments: BodySegment[] = [];
  let lastEnd = 0;
  let m: RegExpExecArray | null;
  IMAGE_REGEX.lastIndex = 0;
  while ((m = IMAGE_REGEX.exec(body)) !== null) {
    if (m.index > lastEnd) {
      segments.push({ type: "text", content: body.slice(lastEnd, m.index) });
    }
    segments.push({ type: "image", url: m[1] ?? "" });
    lastEnd = IMAGE_REGEX.lastIndex;
  }
  if (lastEnd < body.length) {
    segments.push({ type: "text", content: body.slice(lastEnd) });
  }
  if (segments.length === 0) return [{ type: "text", content: "" }];
  return segments;
}

export function segmentsToBody(segments: BodySegment[]): string {
  return segments
    .map((s) => (s.type === "text" ? s.content : `![](${s.url})`))
    .join("");
}

export function countImagesInSegments(segments: BodySegment[]): number {
  return segments.filter((s) => s.type === "image").length;
}
