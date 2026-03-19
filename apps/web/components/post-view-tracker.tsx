"use client";

import { useEffect } from "react";

export function PostViewTracker({
  postId,
  boardType,
}: {
  postId: string;
  boardType: "shared" | "bunny";
}) {
  useEffect(() => {
    fetch("/api/posts/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, boardType }),
    }).catch(() => {});
  }, [postId, boardType]);

  return null;
}
