"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { BunnyCard } from "@/components/bunny-card";
import { Button } from "@workspace/ui/components/button";
import type { MemberProfileRow } from "@workspace/db";
import { uploadBunnyCardImage } from "./bunny-card-upload-actions";
import { resizeImageOnClient } from "@/lib/image/resize-client";

type BunnyCardEditColumnProps = {
  profile: MemberProfileRow;
  /** 기본 카드인 경우 동적 URL 사용 (부모에서 resolveBunnyCardUrl 적용) */
  displayCardUrl?: string | null;
};

export function BunnyCardEditColumn({ profile, displayCardUrl }: BunnyCardEditColumnProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const MAX = 4 * 1024 * 1024;
    const finalFile = file.size > MAX ? await resizeImageOnClient(file) : file;
    const formData = new FormData();
    formData.append("image", finalFile);
    const result = await uploadBunnyCardImage(profile.id, formData);
    e.target.value = "";
    if (result.ok) {
      router.refresh();
    } else {
      alert(result.error);
    }
  }

  return (
    <div className="flex w-full max-w-[280px] flex-col gap-1 sm:col-start-1 sm:row-start-1 sm:justify-end">
      <div className="w-full">
        <BunnyCard cardImageUrl={displayCardUrl ?? profile.cardImageUrl} />
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-hidden
        onChange={handleFileChange}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => inputRef.current?.click()}
      >
        이미지 수정
      </Button>
    </div>
  );
}
