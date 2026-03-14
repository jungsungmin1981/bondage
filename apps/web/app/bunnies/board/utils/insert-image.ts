import type { RefObject } from "react";

/**
 * 본문 텍스트의 커서 위치에 마크다운 이미지 문법 `\n\n![](url)\n\n` 을 삽입한 새 문자열과,
 * 삽입 후 커서가 위치할 인덱스를 반환한다.
 */
export function insertMarkdownImageAtCursor(
  body: string,
  url: string,
  textareaRef: RefObject<HTMLTextAreaElement | null>,
): { newBody: string; newCursorIndex: number } {
  const start = textareaRef.current?.selectionStart ?? body.length;
  const end = textareaRef.current?.selectionEnd ?? body.length;
  const insert = `\n\n![](${url})\n\n`;
  const newBody = body.slice(0, start) + insert + body.slice(end);
  const newCursorIndex = start + insert.length;
  return { newBody, newCursorIndex };
}
