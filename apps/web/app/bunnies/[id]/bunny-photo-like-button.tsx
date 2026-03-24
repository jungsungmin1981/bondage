"use client";

import { useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { toggleBunnyPhotoLike, getBunnyPhotoLikers } from "./photos/actions";

type Props = {
  bunnyProfileId: string;
  photoId: string;
  initialCount: number;
  initialLiked: boolean;
  isOwnPost?: boolean;
};

type Liker = {
  userId: string;
  name: string | null;
  createdAt: Date | null;
};

function displayName(l: Liker): string {
  const n = l.name?.trim();
  if (n) return n;
  return l.userId.length > 8 ? `${l.userId.slice(0, 8)}…` : l.userId;
}

export function BunnyPhotoLikeButton({
  bunnyProfileId,
  photoId,
  initialCount,
  initialLiked,
  isOwnPost = false,
}: Props) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);
  const [likers, setLikers] = useState<Liker[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOwnPost || !open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [isOwnPost, open]);

  useEffect(() => {
    if (!isOwnPost || !open) return;
    let cancelled = false;
    (async () => {
      const result = await getBunnyPhotoLikers(photoId);
      if (!cancelled && result.ok) setLikers(result.likers as Liker[]);
    })();
    return () => { cancelled = true; };
  }, [isOwnPost, open, photoId]);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOwnPost) {
      setOpen((o) => !o);
      return;
    }
    if (pending) return;
    setPending(true);
    try {
      const result = await toggleBunnyPhotoLike(bunnyProfileId, photoId);
      if (result.ok) {
        setLiked(result.liked);
        setCount(result.count);
      }
    } finally {
      setPending(false);
    }
  };

  if (isOwnPost) {
    return (
      <div ref={rootRef} className="relative" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={handleClick}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
          title="좋아요 누른 사람 보기"
          aria-label="좋아요 누른 사람 보기"
        >
          <Heart className="h-3.5 w-3.5" />
          <span>{count}</span>
        </button>
        {open && (
          <div
            className="absolute left-0 top-full z-20 mt-1 min-w-[160px] max-w-[240px] rounded-md border border-border bg-card p-2 text-[10px] shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-1 font-medium text-foreground">좋아요 한 사람</p>
            {likers.length === 0 ? (
              <p className="text-muted-foreground">아직 없습니다.</p>
            ) : (
              <ul className="max-h-32 space-y-1 overflow-y-auto">
                {likers.map((l) => (
                  <li key={l.userId} className="truncate text-foreground">
                    {displayName(l)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
      aria-label={liked ? "좋아요 취소" : "좋아요"}
    >
      <Heart className={`h-3.5 w-3.5 ${liked ? "fill-red-500 text-red-500" : ""}`} />
      <span>{count}</span>
    </button>
  );
}
