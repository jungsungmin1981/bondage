"use client";

import { useEffect, useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { uploadMainBackgroundImage } from "./actions";

type Props = {
  initialUrl: string | null;
};

export function MainBackgroundForm({ initialUrl }: Props) {
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

  const handleSave = async () => {
    if (!file) {
      alert("업로드할 이미지를 먼저 선택해 주세요.");
      return;
    }

    const fd = new FormData();
    fd.set("image", file);

    setUploading(true);
    try {
      const result = await uploadMainBackgroundImage(fd);
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
      {/* 위쪽: 파일 선택 + 적용 */}
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

      {/* 아래쪽: 현재 메인 백그라운드 이미지 */}
      <div className="overflow-hidden rounded-lg border bg-muted">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="메인 백그라운드 미리보기"
            className="h-64 w-full object-cover"
          />
        ) : (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            등록된 메인 백그라운드 이미지가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}

