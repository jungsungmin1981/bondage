/**
 * contenteditable 본문: 마크다운 body <-> HTML 변환 및 직렬화
 */

const IMAGE_REGEX = /!\[[^\]]*\]\(([^)]+)\)/g;

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

/** 마크다운 body → contenteditable에 넣을 HTML */
export function bodyToEditableHtml(body: string): string {
  if (!body) return "";
  const parts: string[] = [];
  let lastEnd = 0;
  let m: RegExpExecArray | null;
  IMAGE_REGEX.lastIndex = 0;
  while ((m = IMAGE_REGEX.exec(body)) !== null) {
    parts.push(escapeHtml(body.slice(lastEnd, m.index)));
    const url = m[1] ?? "";
    parts.push(
      `<span class="board-img-wrap" contenteditable="false"><img src="${escapeAttr(url)}" data-board-img="true" class="max-h-48 max-w-full rounded-lg object-contain" loading="lazy"><button type="button" class="board-img-delete size-8 shrink-0 rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="이미지 제거">×</button></span>`,
    );
    lastEnd = IMAGE_REGEX.lastIndex;
  }
  parts.push(escapeHtml(body.slice(lastEnd)));
  return parts.join("");
}

/** contenteditable 컨테이너 DOM → 마크다운 body */
export function serializeEditableToBody(container: HTMLElement | null): string {
  if (!container) return "";

  function walk(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return (node.textContent ?? "").replace(/\u00A0/g, " ");
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (el.tagName === "BR") return "\n";
      if (el.tagName === "IMG" && el.getAttribute("data-board-img") !== null) {
        const src = el.getAttribute("src") ?? "";
        return `![](${src})`;
      }
      if (el.classList?.contains("board-img-wrap")) {
        const img = el.querySelector("img[data-board-img]");
        const src = img?.getAttribute("src") ?? "";
        return src ? `![](${src})` : "";
      }
      return Array.from(node.childNodes).map(walk).join("");
    }
    return "";
  }

  return Array.from(container.childNodes).map(walk).join("");
}

/** 컨테이너 안 이미지 개수 */
export function countImagesInEditable(container: HTMLElement | null): number {
  if (!container) return 0;
  return container.querySelectorAll("img[data-board-img]").length;
}

/** contenteditable에 이미지 노드 삽입 (현재 선택 위치) */
export function insertImageIntoEditable(
  container: HTMLElement,
  url: string,
): void {
  container.focus();
  const sel = window.getSelection();
  let range: Range;
  if (sel && sel.rangeCount > 0) {
    range = sel.getRangeAt(0);
    if (!container.contains(range.commonAncestorContainer)) {
      range = document.createRange();
      range.selectNodeContents(container);
      range.collapse(false);
    }
  } else {
    range = document.createRange();
    range.selectNodeContents(container);
    range.collapse(false);
  }

  const span = document.createElement("span");
  span.className = "board-img-wrap";
  span.contentEditable = "false";
  span.setAttribute("contenteditable", "false");

  const img = document.createElement("img");
  img.src = url;
  img.setAttribute("data-board-img", "true");
  img.className = "max-h-48 max-w-full rounded-lg object-contain";
  img.loading = "lazy";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className =
    "board-img-delete size-8 shrink-0 rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive";
  btn.setAttribute("aria-label", "이미지 제거");
  btn.textContent = "×";

  span.appendChild(img);
  span.appendChild(btn);

  range.insertNode(span);

  const after = document.createTextNode("\u200B");
  span.parentNode?.insertBefore(after, span.nextSibling);

  range.setStart(after, 1);
  range.collapse(true);
  sel?.removeAllRanges();
  sel?.addRange(range);
}
