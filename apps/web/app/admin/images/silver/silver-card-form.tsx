"use client";

import { useState } from "react";
import { resizeImageOnClient } from "@/lib/image/resize-client";
import { Button } from "@workspace/ui/components/button";
import { uploadSilverCardImage } from "./actions";

type Props = {
  onPreviewChange?: (url: string | null) => void;
};

export function SilverCardForm({ onPreviewChange }: Props) {
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
      alert("???? ???? ?? ??? ???.");
      return;
    }

    const MAX = 4 * 1024 * 1024;
    const finalFile = file.size > MAX ? await resizeImageOnClient(file) : file;
    const fd = new FormData();
    fd.set("image", finalFile);

    setUploading(true);
    try {
      const result = await uploadSilverCardImage(fd);
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
            ?? ??
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
          {uploading ? "?? ??" : "????"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleCancel}
          disabled={uploading || !file || locked}
        >
          ??
        </Button>
        {file && !uploading && (
          <span className="text-xs text-muted-foreground">
            ??? ??: {file.name}
          </span>
        )}
        {uploading && (
          <span className="text-xs text-muted-foreground">??? ??</span>
        )}
      </div>
    </div>
  );
}

