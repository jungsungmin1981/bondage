"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const bodyClassName =
  "text-[15px] leading-[1.6] text-foreground break-words [&_p]:whitespace-pre-wrap [&_p]:break-words";

/** 허용: https:, http:, 상대경로(/), 프로토콜 상대(//). 차단: javascript:, data:, vbscript: 등 */
function isAllowedUrl(url: string | undefined): boolean {
  if (url === undefined || url === "") return false;
  const t = url.trim();
  if (!t) return false;
  const lower = t.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:")
  )
    return false;
  if (lower.startsWith("https:") || lower.startsWith("http:")) return true;
  if (t.startsWith("/")) return true;
  return false;
}

export function PostBodyMarkdown({ body }: { body: string }) {
  const content = body?.trim() || "";
  if (!content) {
    return (
      <div className={bodyClassName}>
        <p className="text-muted-foreground">내용 없음</p>
      </div>
    );
  }
  return (
    <div className={bodyClassName}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children, ...props }) =>
            isAllowedUrl(href) ? (
              <a href={href} {...props}>
                {children}
              </a>
            ) : (
              <span {...props}>{children}</span>
            ),
          img: ({ src, alt, ...props }) =>
            typeof src === "string" && isAllowedUrl(src) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt={alt ?? ""}
                className="max-w-full h-auto rounded-lg"
                loading="lazy"
                {...props}
              />
            ) : null,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
