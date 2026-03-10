"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { addPhotoComment, getPhotoComments } from "./post-comment-actions";

type Comment = Awaited<ReturnType<typeof getPhotoComments>>[number];

type Props = {
  riggerId: string;
  photoId: string;
  /** 서버에서 내려준 초기 목록 — 페이지 재진입 시 바로 개수/목록 표시 */
  initialComments?: Comment[];
};

/** 상대 시간 짧게 */
function formatCommentTime(date: Date | string | null): string {
  if (date == null) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const now = Date.now();
  const diff = now - d.getTime();
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (sec < 60) return "방금";
  if (min < 60) return `${min}분`;
  if (hr < 24) return `${hr}시간`;
  if (day < 7) return `${day}일`;
  return d.toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function displayNickname(c: Comment): string {
  const name = c.authorName?.trim();
  if (name) return name;
  return c.userId.length > 8 ? `${c.userId.slice(0, 8)}…` : c.userId;
}

function normalizeComments(raw: unknown): Comment[] {
  if (!Array.isArray(raw)) return [];
  return raw as Comment[];
}

export function PostCommentBlock({
  riggerId,
  photoId,
  initialComments,
}: Props) {
  const [comments, setComments] = useState<Comment[]>(() =>
    normalizeComments(initialComments),
  );
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // 바깥 클릭 시 패널 닫기
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // 마운트·photoId 변경 시 한 번 로드 → 패널 안 열어도 개수 표시, 재방문 시 클라이언트 네비에서도 갱신
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await getPhotoComments(photoId);
      if (!cancelled) setComments(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [photoId]);

  // 패널 열 때마다 다시 가져와 최신 유지
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const list = await getPhotoComments(photoId);
      if (!cancelled) setComments(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, photoId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    setPending(true);
    try {
      const result = await addPhotoComment(riggerId, photoId, text);
      if (result.ok) {
        setText("");
        const list = await getPhotoComments(photoId);
        setComments(list);
        setOpen(false);
      } else {
        setError(result.error);
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      ref={rootRef}
      className="relative min-w-0 flex-1"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex h-7 items-center">
        <button
          type="button"
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen((o) => !o);
          }}
        >
          <MessageCircle className="h-3.5 w-3.5" />
          <span>댓글 {comments.length > 0 ? comments.length : ""}</span>
        </button>
      </div>
      {open && (
        <div
          className="absolute left-0 right-0 top-full z-20 mt-1 min-w-[180px] rounded-md border border-border bg-card p-2 text-[10px] shadow-lg sm:min-w-[240px]"
          onClick={(e) => e.stopPropagation()}
        >
          <ul className="max-h-40 space-y-2 overflow-y-auto">
            {comments.map((c) => (
              <li key={c.id} className="min-w-0">
                <div className="flex min-w-0 items-baseline gap-1 truncate">
                  <span className="shrink-0 font-semibold text-foreground">
                    {displayNickname(c)}
                  </span>
                  <span className="shrink-0 text-muted-foreground">·</span>
                  <span className="shrink-0 text-muted-foreground">
                    {formatCommentTime(c.createdAt as Date | string | null)}
                  </span>
                </div>
                <p className="mt-0.5 break-words text-foreground">{c.content}</p>
              </li>
            ))}
            {comments.length === 0 && (
              <li className="text-muted-foreground">댓글이 없습니다.</li>
            )}
          </ul>
          <form
            onSubmit={submit}
            className="mt-2 flex flex-col gap-1 border-t border-border/60 pt-2"
          >
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="댓글 입력 (500자)"
              maxLength={500}
              className="w-full rounded border bg-background px-2 py-1 text-xs"
              disabled={pending}
            />
            {error && <p className="text-destructive">{error}</p>}
            <Button type="submit" size="sm" className="h-7 text-xs" disabled={pending}>
              등록
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
