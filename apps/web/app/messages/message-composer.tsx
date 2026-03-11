"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import { Plus } from "lucide-react";
import { sendThreadMessage } from "./actions";

const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const CLIENT_TARGET_MAX_BYTES = 10 * 1024 * 1024; // 10MB (server에 넘기기 전 목표 크기)
const CLIENT_HARD_MAX_BYTES = 60 * 1024 * 1024; // 60MB (브라우저 메모리 보호)
const CLIENT_MAX_DIM = 1600;
const CLIENT_MIN_QUALITY = 0.6;

function isAllowedImageMime(type: string) {
  return (IMAGE_MIME_TYPES as readonly string[]).includes(type);
}

async function fileToJpegUnderLimit(file: File): Promise<File> {
  if (file.size > CLIENT_HARD_MAX_BYTES) {
    throw new Error("이미지 용량이 너무 큽니다. (최대 60MB)");
  }

  // 이미 충분히 작고 타입이 명확하면 그대로 사용
  if (file.size <= CLIENT_TARGET_MAX_BYTES && isAllowedImageMime((file.type ?? "").toLowerCase())) {
    return file;
  }

  const bmp = await createImageBitmap(file);
  let width = bmp.width;
  let height = bmp.height;

  const maxDim = Math.max(width, height);
  if (maxDim > CLIENT_MAX_DIM) {
    const scale = CLIENT_MAX_DIM / maxDim;
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));
  }

  let canvas: HTMLCanvasElement | OffscreenCanvas;
  if (typeof OffscreenCanvas !== "undefined") {
    canvas = new OffscreenCanvas(width, height);
  } else {
    const c = document.createElement("canvas");
    c.width = width;
    c.height = height;
    canvas = c;
  }

  const ctx = (canvas as any).getContext?.("2d");
  if (!ctx) throw new Error("이미지 처리를 시작할 수 없습니다.");
  ctx.drawImage(bmp as any, 0, 0, width, height);
  bmp.close();

  const toBlob = async (quality: number) => {
    if ("convertToBlob" in canvas) {
      return await (canvas as OffscreenCanvas).convertToBlob({ type: "image/jpeg", quality });
    }
    return await new Promise<Blob>((resolve, reject) => {
      (canvas as HTMLCanvasElement).toBlob(
        (b) => (b ? resolve(b) : reject(new Error("이미지 변환에 실패했습니다."))),
        "image/jpeg",
        quality,
      );
    });
  };

  let quality = 0.82;
  let blob = await toBlob(quality);
  while (blob.size > CLIENT_TARGET_MAX_BYTES && quality > CLIENT_MIN_QUALITY) {
    quality = Math.max(CLIENT_MIN_QUALITY, quality - 0.08);
    blob = await toBlob(quality);
  }

  // 그래도 큰 경우엔 해상도를 더 줄여본다(1회)
  if (blob.size > CLIENT_TARGET_MAX_BYTES) {
    const shrink = 0.8;
    const nextW = Math.max(1, Math.round(width * shrink));
    const nextH = Math.max(1, Math.round(height * shrink));
    let canvas2: HTMLCanvasElement | OffscreenCanvas;
    if (typeof OffscreenCanvas !== "undefined") {
      canvas2 = new OffscreenCanvas(nextW, nextH);
    } else {
      const c2 = document.createElement("canvas");
      c2.width = nextW;
      c2.height = nextH;
      canvas2 = c2;
    }
    const ctx2 = (canvas2 as any).getContext?.("2d");
    if (!ctx2) throw new Error("이미지 처리를 시작할 수 없습니다.");
    ctx2.drawImage(canvas as any, 0, 0, width, height, 0, 0, nextW, nextH);
    const blob2 = await (async () => {
      if ("convertToBlob" in canvas2) {
        return await (canvas2 as OffscreenCanvas).convertToBlob({ type: "image/jpeg", quality });
      }
      return await new Promise<Blob>((resolve, reject) => {
        (canvas2 as HTMLCanvasElement).toBlob(
          (b) => (b ? resolve(b) : reject(new Error("이미지 변환에 실패했습니다."))),
          "image/jpeg",
          quality,
        );
      });
    })();
    blob = blob2;
  }

  return new File([blob], `upload-${Date.now()}.jpg`, { type: "image/jpeg" });
}

export function MessageComposer({ threadId }: { threadId: string }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bodyInputRef = useRef<HTMLInputElement | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendTextOnly = async () => {
    setSending(true);
    setError(null);
    const raw = bodyInputRef.current?.value ?? "";
    const body = raw.trim();
    const fd = new FormData();
    fd.set("threadId", threadId);
    fd.set("body", body);
    const result = await sendThreadMessage(fd);
    setSending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (bodyInputRef.current) bodyInputRef.current.value = "";
    router.refresh();
  };

  const sendImagesOnly = async (files: File[]) => {
    setSending(true);
    setError(null);
    try {
      const processed = await Promise.all(files.map(fileToJpegUnderLimit));
      const fd = new FormData();
      fd.set("threadId", threadId);
      for (const f of processed) fd.append("images", f);
      const result = await sendThreadMessage(fd);
      setSending(false);
      if (!result.ok) {
        setError(result.error);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch (e) {
      setSending(false);
      setError(e instanceof Error ? e.message : "이미지 전송 실패");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (sending) return;
        void sendTextOnly();
      }}
      className="space-y-2"
    >
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 rounded-full"
          aria-label="이미지 첨부"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending}
        >
          <Plus className="size-5" strokeWidth={2} />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          name="images"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.currentTarget.files ?? []);
            if (files.length === 0) return;
            if (sending) return;
            // 사진 선택하면 사진만 전송
            void sendImagesOnly(files);
          }}
        />
        <input
          ref={bodyInputRef}
          name="body"
          className="h-12 w-full flex-1 rounded-full border bg-muted/30 px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="쪽지"
          disabled={sending}
          onChange={() => {
            // 타이핑을 시작하면 이전 경고는 숨긴다.
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            // 한글/일본어 IME 조합 중 Enter는 "전송"이 아니라 "조합 확정"으로 쓰이므로 막는다.
            // (조합 중 requestSubmit하면 formData에 최신 값이 안 들어가 전송이 안 된 것처럼 보일 수 있음)
            const composing = (e.nativeEvent as KeyboardEvent & { isComposing?: boolean }).isComposing;
            if (e.key === "Enter" && !e.shiftKey && !composing) {
              e.preventDefault();
              if (!sending) void sendTextOnly();
            }
          }}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}

