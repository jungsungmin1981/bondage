"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { Input } from "@workspace/ui/components/input";
import { uploadBunnyPhoto } from "./actions";

const MAX_PHOTOS = 4;
const COMPRESSION_OPTIONS = {
  maxSizeMB: 1.5,
  maxWidthOrHeight: 1280,
  useWebWorker: false,
};

type Props = {
  bunnyProfileId: string;
};

export function BunnyPhotoUploadForm({ bunnyProfileId }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [selectedCount, setSelectedCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) {
      setPreviewUrls([]);
      setSelectedCount(0);
      return;
    }
    const list = Array.from(files).slice(0, MAX_PHOTOS);
    setSelectedCount(files.length);
    const urls = list.map((f) => URL.createObjectURL(f));
    setPreviewUrls((prev) => {
      prev.forEach((u) => URL.revokeObjectURL(u));
      return urls;
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("bunnyProfileId", bunnyProfileId);

    const rawFiles = formData.getAll("image");
    const list = rawFiles.filter((f): f is File => f instanceof File).slice(0, MAX_PHOTOS);
    if (list.length === 0) {
      setError("이미지 파일을 선택해 주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const { default: imageCompression } = await import("browser-image-compression");
      for (let i = 0; i < list.length; i++) {
        const file = list[i];
        if (!file) continue;
        try {
          const compressed = await imageCompression(file, COMPRESSION_OPTIONS);
          formData.append(`image_${i}`, compressed);
        } catch {
          formData.append(`image_${i}`, file);
        }
      }
      const result = await uploadBunnyPhoto(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      form.reset();
      setPreviewUrls((prev) => {
        prev.forEach((u) => URL.revokeObjectURL(u));
        return [];
      });
      router.push(`/bunnies/${encodeURIComponent(bunnyProfileId)}`);
    } catch (err) {
      console.error(err);
      setError("이미지 압축 또는 업로드에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm sm:p-6">
      <h1 className="text-base font-semibold sm:text-lg">사진 등록</h1>
      <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
        사진 등록 후 발생되는 모든 책임은 본인에게 있음을 동의한다면 등록을 진행하세요.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <input type="hidden" name="bunnyProfileId" value={bunnyProfileId} />
        <div>
          <Label htmlFor="bunny-caption" className="mb-2 block text-sm">
            제목 (선택)
          </Label>
          <Input
            id="bunny-caption"
            name="caption"
            maxLength={30}
            placeholder="사진 제목 (최대 30자)"
            className="max-w-md"
          />
        </div>

        <div>
          <Label htmlFor="bunny-photo-file" className="mb-2 block text-sm">
            사진 파일 (최대 {MAX_PHOTOS}장)
          </Label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="flex-1">
              <label
                htmlFor="bunny-photo-file"
                className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/40 px-3 py-6 text-sm text-muted-foreground transition hover:border-ring hover:bg-muted"
              >
                <ImageIcon className="h-5 w-5" />
                <span className="text-xs sm:text-sm">
                  사진 촬영 또는 앨범에서 선택 (JPEG, PNG, WebP)
                </span>
              </label>
              <input
                ref={fileInputRef}
                id="bunny-photo-file"
                name="image"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="sr-only"
              />
            </div>
            {previewUrls.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {previewUrls.map((url, i) => (
                  <div
                    key={url}
                    className="aspect-square w-20 shrink-0 overflow-hidden rounded-lg border bg-muted sm:w-24"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`미리보기 ${i + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          {selectedCount > MAX_PHOTOS && (
            <p className="mt-1 text-xs text-muted-foreground">
              {selectedCount}장 선택됨. 최대 {MAX_PHOTOS}장만 등록됩니다.
            </p>
          )}
        </div>

        {error && <p className="text-xs text-destructive sm:text-sm">{error}</p>}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-muted-foreground sm:text-xs">
            등록 시 워터마크가 이미지에 합성되어 저장됩니다.
          </p>
          <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
            {submitting ? "업로드 중…" : "등록"}
          </Button>
        </div>
      </form>
    </section>
  );
}
