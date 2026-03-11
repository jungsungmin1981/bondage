"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { uploadGoldCardImage } from "./actions";

type Props = {
  onPreviewChange?: (url: string | null) => void;
};

export function GoldCardForm({ onPreviewChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [locked, setLocked] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setLocked(false);
    if (f) {
      const objectUrl = URL.createObjectURL(f);
      onPreviewChange?.(objectUrl);
    } else {
      onPreviewChange?.(null);
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
      const result = await uploadGoldCardImage(fd);
      if (result.ok) {
        setFile(null);
        setLocked(true);
        onPreviewChange?.(null);
      } else {
        alert(result.error);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setFile(null);
    setLocked(true);
    onPreviewChange?.(null);
  };

  return (
    <div className="space-y-3">
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
    </div>
  );
}

