"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { ToggleGroup, ToggleGroupItem } from "@workspace/ui/components/toggle-group";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { uploadPhoto } from "./actions";

const MAX_PHOTOS = 4;
const COMPRESSION_OPTIONS = {
  maxSizeMB: 1.5,
  maxWidthOrHeight: 1280,
  useWebWorker: false,
};

type Props = {
  riggerId: string;
};

export function PhotoUploadForm({ riggerId }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [selectedCount, setSelectedCount] = useState(0);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [model, setModel] = useState<"object" | "self" | "bunny" | null>(null);
  const [prevModel, setPrevModel] = useState<"object" | "self" | "bunny" | null>(null);
  const [bunnyPickerOpen, setBunnyPickerOpen] = useState(false);
  const [bunnyUsers, setBunnyUsers] = useState<
    { id: string; email: string; name: string | null }[]
  >([]);
  const [bunnyLoading, setBunnyLoading] = useState(false);
  const [bunnyLoadError, setBunnyLoadError] = useState<string | null>(null);
  const [bunnyQuery, setBunnyQuery] = useState("");
  const [selectedBunnyEmails, setSelectedBunnyEmails] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedBunnyEmailSet = useMemo(
    () => new Set(selectedBunnyEmails),
    [selectedBunnyEmails],
  );

  const bunnyNameByEmail = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of bunnyUsers) {
      if (!u.email) continue;
      if (u.name && u.name.trim()) map.set(u.email, u.name.trim());
    }
    return map;
  }, [bunnyUsers]);

  const selectedBunnyNames = useMemo(() => {
    return selectedBunnyEmails
      .map((email) => bunnyNameByEmail.get(email))
      .filter((v): v is string => Boolean(v));
  }, [selectedBunnyEmails, bunnyNameByEmail]);

  useEffect(() => {
    if (!bunnyPickerOpen) return;
    // 버니 목록 로드 (이미 로드한 적 있으면 재사용)
    if (bunnyUsers.length > 0) return;
    let cancelled = false;
    setBunnyLoading(true);
    setBunnyLoadError(null);
    fetch("/api/users")
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as unknown;
        if (!Array.isArray(data)) throw new Error("Invalid response");
        const parsed = data
          .map((u: any) => ({
            id: String(u?.id ?? ""),
            email: String(u?.email ?? ""),
            name: u?.name == null ? null : String(u.name),
          }))
          .filter((u) => u.email.startsWith("bunny") && u.email.endsWith("@example.com"));
        if (!cancelled) setBunnyUsers(parsed);
      })
      .catch((e) => {
        if (!cancelled) {
          setBunnyLoadError(
            e instanceof Error ? e.message : "버니 목록을 불러오지 못했습니다.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setBunnyLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bunnyPickerOpen, bunnyUsers.length]);

  const filteredBunnies = useMemo(() => {
    const q = bunnyQuery.trim().toLowerCase();
    const list = bunnyUsers.slice().sort((a, b) => a.email.localeCompare(b.email));
    if (!q) return list;
    return list.filter((u) => {
      const name = (u.name ?? "").toLowerCase();
      return u.email.toLowerCase().includes(q) || name.includes(q);
    });
  }, [bunnyUsers, bunnyQuery]);

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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const caption = (form.caption as HTMLTextAreaElement | undefined)?.value?.trim() ?? "";
    if (!caption) {
      setError("제목을 입력해 주세요.");
      return;
    }
    if (!model) {
      setError("모델을 선택해 주세요.");
      return;
    }
    if (model === "bunny" && selectedBunnyEmails.length === 0) {
      setError("버니를 1명 이상 선택해 주세요.");
      return;
    }
    const files = fileInputRef.current?.files;
    if (!files?.length) {
      setError("이미지 파일을 선택해 주세요.");
      return;
    }
    const list = Array.from(files).slice(0, MAX_PHOTOS);
    if (list.length > MAX_PHOTOS) {
      setError(`최대 ${MAX_PHOTOS}장까지 선택할 수 있습니다.`);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const formData = new FormData(form);
      formData.delete("image");
      formData.set("riggerId", riggerId);

      try {
        const { default: imageCompression } = await import("browser-image-compression");
        for (let i = 0; i < list.length; i++) {
          const file = list[i];
          if (!file) continue;
          const compressed = await imageCompression(file, COMPRESSION_OPTIONS);
          formData.append(`image_${i}`, compressed);
        }
      } catch {
        for (let i = 0; i < list.length; i++) {
          const file = list[i];
          if (!file) continue;
          formData.append(`image_${i}`, file);
        }
      }

      const result = await uploadPhoto(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      form.reset();
      setPreviewUrls((prev) => {
        prev.forEach((u) => URL.revokeObjectURL(u));
        return [];
      });
      setVisibility("public");
      setModel(null);
      setPrevModel(null);
      setSelectedBunnyEmails([]);
      router.push(`/rigger/${riggerId}`);
    } catch (e) {
      console.error("Photo upload error:", e);
      const message = e instanceof Error ? e.message : String(e);
      if (message.includes("Failed to fetch") || message.includes("network")) {
        setError("네트워크 오류가 발생했습니다. 연결을 확인한 뒤 다시 시도해 주세요.");
      } else {
        setError("이미지 압축 또는 업로드에 실패했습니다. 다시 시도해 주세요.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm sm:p-6">
      <h1 className="text-base font-semibold sm:text-lg">사진등록</h1>
      <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
        사진 등록후 발생되는 모든 책임은 본인에게 있음을 동의 한다면 등록 진행을 하십시오!
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <Label className="mb-2 block text-sm">공개유무</Label>
          <ToggleGroup
            type="single"
            value={visibility}
            onValueChange={(v) => {
              if (v === "public" || v === "private") setVisibility(v);
            }}
            variant="outline"
            className="w-full"
          >
            <ToggleGroupItem value="public" className="flex-1 justify-center">
              공개
            </ToggleGroupItem>
            <ToggleGroupItem value="private" className="flex-1 justify-center">
              비공개
            </ToggleGroupItem>
          </ToggleGroup>
          <input type="hidden" name="visibility" value={visibility} />
        </div>

        <div>
          <Label className="mb-2 block text-sm">모델</Label>
          <ToggleGroup
            type="single"
            value={model ?? ""}
            onValueChange={(v) => {
              if (v === "object" || v === "self") {
                setModel(v);
                setPrevModel(v);
                setSelectedBunnyEmails([]);
                return;
              }
              if (v === "bunny") {
                setPrevModel(model);
                setModel("bunny");
                setBunnyPickerOpen(true);
              }
            }}
            variant="outline"
            className="w-full"
          >
            <ToggleGroupItem value="object" className="flex-1 justify-center">
              사물
            </ToggleGroupItem>
            <ToggleGroupItem value="self" className="flex-1 justify-center">
              셀프
            </ToggleGroupItem>
            <ToggleGroupItem value="bunny" className="flex-1 justify-center">
              버니
            </ToggleGroupItem>
          </ToggleGroup>
          {model && <input type="hidden" name="model" value={model} />}
          {model === "bunny" && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:text-sm">
              <span className="shrink-0">선택된 버니:</span>
              {selectedBunnyEmails.length === 0 ? (
                <span className="text-foreground">없음</span>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {selectedBunnyNames.length > 0 ? (
                    selectedBunnyNames.map((name) => (
                      <span
                        key={name}
                        className="rounded-full bg-muted px-2 py-0.5 text-[12px] text-foreground"
                      >
                        {name}
                      </span>
                    ))
                  ) : (
                    <span className="text-foreground">
                      선택됨 ({selectedBunnyEmails.length}명)
                    </span>
                  )}
                </div>
              )}
              <button
                type="button"
                className="underline underline-offset-4 hover:text-foreground"
                onClick={() => setBunnyPickerOpen(true)}
              >
                변경
              </button>
              {selectedBunnyEmails.length > 0 && (
                <button
                  type="button"
                  className="underline underline-offset-4 hover:text-foreground"
                  onClick={() => setSelectedBunnyEmails([])}
                >
                  해제
                </button>
              )}
            </div>
          )}
          {selectedBunnyEmails.map((email) => (
            <input key={email} type="hidden" name="bunnyEmail" value={email} />
          ))}
        </div>
        <div>
          <Label htmlFor="caption" className="mb-2 block text-sm">
            제목 <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="caption"
            name="caption"
            rows={2}
            maxLength={30}
            required
            placeholder="사진 제목 (최대 30자)"
          />
          <p className="mt-1 text-xs text-muted-foreground">최대 30자</p>
        </div>

        <div>
          <Label htmlFor="photo-file" className="mb-2 block text-sm">
            사진 파일 (최대 {MAX_PHOTOS}장)
          </Label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="flex-1">
              <label
                htmlFor="photo-file"
                className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/40 px-3 py-6 text-sm text-muted-foreground transition hover:border-ring hover:bg-muted"
              >
                <ImageIcon className="h-5 w-5" />
                <span className="text-xs sm:text-sm">
                  사진 촬영 또는 앨범에서 선택 (JPEG, PNG, WebP · 브라우저에서 자동 압축)
                </span>
              </label>
              <input
                ref={fileInputRef}
                id="photo-file"
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
            등록 시 /watermark 에서 설정한 워터마크가 이미지에 합성되어 저장됩니다.
          </p>
          <Button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto"
          >
            {submitting ? "업로드 중…" : "등록"}
          </Button>
        </div>
      </form>

      <Dialog
        open={bunnyPickerOpen}
        onOpenChange={(open) => {
          setBunnyPickerOpen(open);
          if (!open && model === "bunny" && selectedBunnyEmails.length === 0) {
            // 선택 없이 닫으면 이전 모델로 복귀
            setModel(prevModel);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>버니 선택</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              value={bunnyQuery}
              onChange={(e) => setBunnyQuery(e.target.value)}
              placeholder="이메일/이름 검색…"
            />

            {bunnyLoading && (
              <p className="text-sm text-muted-foreground">불러오는 중…</p>
            )}
            {bunnyLoadError && (
              <p className="text-sm text-destructive">
                버니 목록을 불러오지 못했습니다: {bunnyLoadError}
              </p>
            )}

            {!bunnyLoading && !bunnyLoadError && (
              <div className="max-h-[50vh] overflow-y-auto rounded-lg border">
                <ul className="divide-y">
                  {filteredBunnies.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-muted/40"
                        onClick={() => {
                          setSelectedBunnyEmails((prev) => {
                            if (prev.includes(u.email)) {
                              return prev.filter((e) => e !== u.email);
                            }
                            return [...prev, u.email];
                          });
                        }}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-mono text-[12px] sm:text-sm">
                            {u.email}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {u.name ?? "-"}
                          </p>
                        </div>
                        <div
                          className={[
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[10px] font-semibold",
                            selectedBunnyEmailSet.has(u.email)
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-muted-foreground/40 text-muted-foreground",
                          ].join(" ")}
                          aria-hidden
                        >
                          {selectedBunnyEmailSet.has(u.email) ? "✓" : ""}
                        </div>
                      </button>
                    </li>
                  ))}
                  {filteredBunnies.length === 0 && (
                    <li className="px-3 py-8 text-center text-sm text-muted-foreground">
                      검색 결과가 없습니다.
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setBunnyPickerOpen(false)}
            >
              닫기
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (selectedBunnyEmails.length === 0) return;
                setBunnyPickerOpen(false);
              }}
              disabled={selectedBunnyEmails.length === 0}
            >
              선택 ({selectedBunnyEmails.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
