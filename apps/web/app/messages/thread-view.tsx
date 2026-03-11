"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import { MessageComposer } from "./message-composer";

export type ThreadMessage = {
  id: string;
  senderUserId: string;
  body: string | null;
  createdAt: Date;
  attachments: { id: string; type: string; url: string }[];
};

export function ThreadView({
  threadId,
  sessionUserId,
  initialMessages,
  otherNickname,
  otherMarkImageUrl,
}: {
  threadId: string;
  sessionUserId: string;
  initialMessages: ThreadMessage[];
  otherNickname?: string | null;
  otherMarkImageUrl?: string | null;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<ThreadMessage[]>(initialMessages);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let cancelled = false;
    let refreshTimer: number | null = null;

    const scheduleRefresh = () => {
      if (refreshTimer) return;
      refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        router.refresh();
      }, 120);
    };

    const run = async () => {
      try {
        const res = await fetch("/api/ws-token", { cache: "no-store" });
        const json = (await res.json()) as { ok: boolean; token?: string };
        if (!json.ok || !json.token) return;
        if (cancelled) return;

        const base =
          (process.env.NEXT_PUBLIC_WS_URL as string | undefined) ||
          `ws://${window.location.hostname}:3001`;
        ws = new WebSocket(`${base}?token=${encodeURIComponent(json.token)}`);

        ws.addEventListener("open", () => {
          ws?.send(JSON.stringify({ type: "subscribe", threadId }));
        });
        ws.addEventListener("message", (ev) => {
          try {
            const msg = JSON.parse(String(ev.data)) as any;
            if (msg?.type === "message:new" && msg.threadId === threadId) {
              scheduleRefresh();
            }
          } catch {
            // ignore
          }
        });
      } catch {
        // ignore
      }
    };

    void run();

    return () => {
      cancelled = true;
      if (refreshTimer) window.clearTimeout(refreshTimer);
      if (ws && ws.readyState === ws.OPEN) {
        try {
          ws.send(JSON.stringify({ type: "unsubscribe", threadId }));
        } catch {
          // ignore
        }
      }
      try {
        ws?.close();
      } catch {
        // ignore
      }
    };
  }, [router, threadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  return (
    <div className="flex h-[calc(100dvh-7rem)] flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-muted">
            {otherMarkImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={otherMarkImageUrl}
                alt="리거 마크"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                ?
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {otherNickname ?? "상대"}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm">
          프로필 보기
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-2">
          {messages.map((m) => {
            const mine = m.senderUserId === sessionUserId;
            return (
              <div key={m.id} className={mine ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    mine
                      ? "max-w-[80%] rounded-2xl bg-blue-500/90 px-3 py-2 text-sm text-white"
                      : "max-w-[80%] rounded-2xl bg-muted px-3 py-2 text-sm"
                  }
                >
                  {m.body ? <p className="whitespace-pre-wrap">{m.body}</p> : null}
                  {m.attachments?.length ? (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {m.attachments.map((a) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={a.id}
                          src={a.url}
                          alt="첨부 이미지"
                          className="w-full rounded-lg object-cover"
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>
      <div className="border-t px-4 py-3">
        <MessageComposer threadId={threadId} />
      </div>
    </div>
  );
}

