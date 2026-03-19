"use client";

import { useRef, useState } from "react";
import { resizeImageOnClient } from "@/lib/image/resize-client";

const MAX_FILE_SIZE_BEFORE_RESIZE = 4 * 1024 * 1024; // 4MB

/**
 * 이미지 파일 input에 연결하여 4MB 초과 시 자동 리사이즈.
 * Vercel Server Action / API Route 4.5MB 요청 크기 제한 대응.
 *
 * @example
 * const { inputRef, preview, error, handleChange } = useImageResize();
 * <input ref={inputRef} type="file" accept="image/*" onChange={handleChange} />
 * {preview && <img src={preview} />}
 * {error && <p>{error}</p>}
 */
export function useImageResize(initialPreview: string | null = null) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(initialPreview);
  const [error, setError] = useState<string | null>(null);
  const [resizing, setResizing] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setResizing(false);

    try {
      let finalFile = file;
      if (file.size > MAX_FILE_SIZE_BEFORE_RESIZE) {
        setResizing(true);
        finalFile = await resizeImageOnClient(file);
        setResizing(false);

        // input의 파일을 리사이즈된 파일로 교체
        if (inputRef.current) {
          const dt = new DataTransfer();
          dt.items.add(finalFile);
          inputRef.current.files = dt.files;
        }
      }

      const reader = new FileReader();
      reader.onload = () => setPreview(String(reader.result));
      reader.readAsDataURL(finalFile);
    } catch {
      setResizing(false);
      setError("이미지 처리에 실패했습니다. 다른 이미지를 선택해 주세요.");
    }
  }

  /**
   * fetch FormData 전송 전에 파일을 리사이즈하여 File 객체 반환.
   * Server Action이 아닌 fetch("/api/...") 방식에서 사용.
   */
  async function resizeFile(file: File): Promise<File> {
    if (file.size <= MAX_FILE_SIZE_BEFORE_RESIZE) return file;
    return resizeImageOnClient(file);
  }

  return { inputRef, preview, setPreview, error, resizing, handleChange, resizeFile };
}
