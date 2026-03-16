"use client";

import { StickyNote } from "lucide-react";
import { useState } from "react";

const MESSAGE_ICON_SRC = "/icons/message-icon.png";

/** 미확인 메시지가 있으면 아이콘을 파란색으로 표시 */
const BLUE_FILTER =
  "invert(48%) sepia(79%) saturate(2476%) hue-rotate(186deg) brightness(98%) contrast(97%)";

export function MessageIcon({ hasUnread = false }: { hasUnread?: boolean }) {
  const [useFallback, setUseFallback] = useState(false);

  if (useFallback) {
    return (
      <StickyNote
        className={`size-7 shrink-0 ${hasUnread ? "text-blue-600" : "text-foreground"}`}
        strokeWidth={2}
      />
    );
  }

  return (
    <img
      src={MESSAGE_ICON_SRC}
      alt=""
      className={hasUnread ? "size-7 shrink-0" : "size-7 shrink-0 dark:invert"}
      width={28}
      height={28}
      onError={() => setUseFallback(true)}
      style={hasUnread ? { filter: BLUE_FILTER } : undefined}
    />
  );
}
