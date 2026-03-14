"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const bodyClassName =
  "text-[15px] leading-[1.6] text-foreground break-words [&_p]:whitespace-pre-wrap [&_p]:break-words";

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
          img: ({ src, alt, ...props }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={alt ?? ""}
              className="max-w-full h-auto rounded-lg"
              loading="lazy"
              {...props}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
