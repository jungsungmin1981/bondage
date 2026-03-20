"use client";

import { useState } from "react";
import { resizeImageOnClient } from "@/lib/image/resize-client";
import { Button } from "@workspace/ui/components/button";
import { uploadBunnyDefaultCardImage } from "./actions";

const FALLBACK_URL = "/default-bunny-card.png";

type Props = {
  initialUrl: string | null;
};

export function BunnyDefaultCardForm({ initialUrl }: Props) {
  const [savedUrl, setSavedUrl] = useState<string | null>(initialUrl);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialUrl);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [locked, setLocked] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setLocked(false);
    if (f) {
      const objectUrl = URL.createObjectURL(f);
      setPreviewUrl(objectUrl);
    }
  };

  const handleImageError = () => {
    setPreviewUrl((url) => (url === FALLBACK_URL ? null : FALLBACK_URL));
  };

  const handleSave = async () => {
    if (!file) {
      alert("업로드할 이미지를 먼저 선택해 주세요.");
      return;
    }

    const MAX = 4 * 1024 * 1024;
    const finalFile = file.size > MAX ? await resizeImageOnClient(file) : file;
    const fd = new FormData();
    fd.set("image", finalFile);

    setUploading(true);
    try {
      const result = await uploadBunnyDefaultCardImage(fd);
      if (result.ok) {
        const urlWithTs = `${result.url}?t=${Date.now()}`;
        setSavedUrl(urlWithTs);
        setPreviewUrl(urlWithTs);
        setFile(null);
        setLocked(true);
      } else {
        alert(result.error);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setFile(null);
    setPreviewUrl(savedUrl);
    setLocked(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium">
          <span className="rounded border bg-background px-3 py-1.5 shadow-sm">
            파일 선택
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={uploading || !file || locked}
          className="bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-40"
        >
          {uploading ? "저장 중…" : "저장하기"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleCancel}
          disabled={uploading || !file || locked}
        >
          취소
        </Button>
        {file && !uploading && (
          <span className="text-xs text-muted-foreground">
            선택된 파일: {file.name}
          </span>
        )}
        {uploading && (
          <span className="text-xs text-muted-foreground">업로드 중…</span>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border-2 border-border bg-muted/30 max-w-[280px] aspect-[3/4] min-h-[190px] sm:min-h-[210px]">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="버니 기본 카드 미리보기"
            className="h-full w-full object-cover object-center"
            onError={handleImageError}
          />
        ) : (
          <div className="flex h-full min-h-[190px] items-center justify-center text-sm text-muted-foreground">
            등록된 버니 기본 카드 이미지가 없습니다.
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        카드 이미지는 폭 280px, 3:4 비율(280×373 권장)로 업로드하면 가장 잘 표시됩니다.
      </p>
    </div>
  );
}
