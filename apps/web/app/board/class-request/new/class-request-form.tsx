"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { ImagePlus, X } from "lucide-react";
import { resizeImageOnClient } from "@/lib/image/resize-client";
import { createClassRequestAction } from "@/app/board/class-request-actions";

const ROPE_THICKNESS = [6, 7, 8, 9, 10, 11, 12] as const;
const ROPE_LENGTH = [6, 7, 8, 9, 10, 11, 12] as const;
const QUANTITY = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const MAX_IMAGE_SIZE = 4 * 1024 * 1024;
const MAX_IMAGES = 5;

const LEVEL_LABELS: Record<string, string> = {
  beginner: "초급",
  intermediate: "중급",
  advanced: "고급",
};

type ImageItem = {
  preview: string;
  file: File;
};

export function ClassRequestForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [level, setLevel] = useState("");
  const [description, setDescription] = useState("");
  const [ropeThickness, setRopeThickness] = useState("");
  const [ropeLength, setRopeLength] = useState("");
  const [quantity, setQuantity] = useState("");
  const [images, setImages] = useState<ImageItem[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    e.target.value = "";
    setImageError(null);

    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      setImageError(`이미지는 최대 ${MAX_IMAGES}장까지 추가할 수 있습니다.`);
      return;
    }

    const toAdd = files.slice(0, remaining);
    const newItems: ImageItem[] = [];

    for (const file of toAdd) {
      try {
        const finalFile = file.size > MAX_IMAGE_SIZE ? await resizeImageOnClient(file) : file;
        const preview = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.readAsDataURL(finalFile);
        });
        newItems.push({ preview, file: finalFile });
      } catch {
        setImageError("이미지 처리에 실패했습니다.");
        return;
      }
    }

    setImages((prev) => [...prev, ...newItems]);
  }

  function handleRemoveImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!level) {
      setSubmitError("난이도를 선택해 주세요.");
      return;
    }
    setSubmitError(null);

    // FormData 직접 구성 (이미지 파일을 상태에서 직접 추가)
    const fd = new FormData();
    fd.set("title", title.trim());
    fd.set("level", level);
    fd.set("description", description.trim());
    if (ropeThickness) fd.set("ropeThicknessMm", ropeThickness);
    if (ropeLength) fd.set("ropeLengthM", ropeLength);
    if (quantity) fd.set("quantity", quantity);
    images.forEach((item, i) => {
      fd.set(`image_${i}`, item.file, item.file.name);
    });

    startTransition(async () => {
      const result = await createClassRequestAction(null, fd);
      if (!result || result.ok === false) {
        setSubmitError(result?.error ?? "등록에 실패했습니다.");
        return;
      }
      router.push("/board/suggestion?tab=class-request");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* 제목 */}
      <div className="space-y-2">
        <Label htmlFor="cr-title">제목 <span className="text-destructive">*</span></Label>
        <Input
          id="cr-title"
          name="title"
          required
          maxLength={100}
          placeholder="원하는 클래스 제목을 입력하세요"
          className="min-h-[44px]"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {/* 난이도 */}
      <div className="space-y-2">
        <Label htmlFor="cr-level">난이도 <span className="text-destructive">*</span></Label>
        <Select value={level} onValueChange={setLevel} required>
          <SelectTrigger id="cr-level" className="min-h-[44px] w-full" suppressHydrationWarning>
            <SelectValue placeholder="난이도 선택" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(LEVEL_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 설명 */}
      <div className="space-y-2">
        <Label htmlFor="cr-description">설명 <span className="text-destructive">*</span></Label>
        <Textarea
          id="cr-description"
          name="description"
          required
          maxLength={2000}
          placeholder="원하는 클래스의 내용이나 특징을 설명해 주세요 (최대 2000자)"
          rows={5}
          className="resize-none"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {/* 로프 두께 */}
      <div className="space-y-2">
        <Label htmlFor="cr-rope-thickness">로프 두께 (mm)</Label>
        <Select value={ropeThickness} onValueChange={setRopeThickness}>
          <SelectTrigger id="cr-rope-thickness" className="min-h-[44px] w-full" suppressHydrationWarning>
            <SelectValue placeholder="선택 (선택사항)" />
          </SelectTrigger>
          <SelectContent>
            {ROPE_THICKNESS.map((v) => (
              <SelectItem key={v} value={String(v)}>{v}mm</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 로프 길이 */}
      <div className="space-y-2">
        <Label htmlFor="cr-rope-length">로프 길이 (m)</Label>
        <Select value={ropeLength} onValueChange={setRopeLength}>
          <SelectTrigger id="cr-rope-length" className="min-h-[44px] w-full" suppressHydrationWarning>
            <SelectValue placeholder="선택 (선택사항)" />
          </SelectTrigger>
          <SelectContent>
            {ROPE_LENGTH.map((v) => (
              <SelectItem key={v} value={String(v)}>{v}m</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 수량 */}
      <div className="space-y-2">
        <Label htmlFor="cr-quantity">수량</Label>
        <Select value={quantity} onValueChange={setQuantity}>
          <SelectTrigger id="cr-quantity" className="min-h-[44px] w-full" suppressHydrationWarning>
            <SelectValue placeholder="선택 (선택사항)" />
          </SelectTrigger>
          <SelectContent>
            {QUANTITY.map((v) => (
              <SelectItem key={v} value={String(v)}>{v}개</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 이미지 */}
      <div className="space-y-2">
        <Label>참고 이미지 (선택, 최대 {MAX_IMAGES}장)</Label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          aria-hidden
          onChange={handleImageChange}
        />

        {images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {images.map((item, i) => (
              <div key={i} className="relative h-24 w-24 shrink-0">
                <img
                  src={item.preview}
                  alt={`이미지 ${i + 1}`}
                  className="h-full w-full rounded-lg border border-border object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(i)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {images.length < MAX_IMAGES && (
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px]"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="mr-2 size-4" />
            이미지 추가 ({images.length}/{MAX_IMAGES})
          </Button>
        )}

        {imageError && <p className="text-sm text-destructive">{imageError}</p>}
      </div>

      {submitError && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {submitError}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" className="min-h-[44px]" disabled={isPending || !level}>
          {isPending ? "등록 중..." : "요청 등록"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-[44px]"
          onClick={() => router.back()}
        >
          취소
        </Button>
      </div>
    </form>
  );
}
