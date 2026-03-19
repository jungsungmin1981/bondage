"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { resizeImageOnClient } from "@/lib/image/resize-client";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { ToggleGroup, ToggleGroupItem } from "@workspace/ui/components/toggle-group";
import { ChevronLeft, ChevronRight, CircleCheck } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { ClassCard } from "@/app/class/beginner/class-card";
import type { ClassCard as ClassCardType } from "@/app/class/beginner/data";
import {
  createClassPostAction,
  deleteClassPostAction,
  listClassPostsAction,
  updateClassPostAction,
} from "../actions";

const ROPE_THICKNESS = [6, 7, 8, 9, 10, 11, 12] as const;
const ROPE_LENGTH = [6, 7, 8, 9, 10, 11, 12] as const;
const QUANTITY = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const MAX_EXTRA_IMAGES = 5;
const DESCRIPTION_MAX_LEN = 200;
const TITLE_MAX_LEN = 15;
const LEVEL = "beginner" as const;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("파일을 읽을 수 없습니다."));
    reader.readAsDataURL(file);
  });
}

async function uploadImageToS3(file: File, postId: string) {
  const MAX = 4 * 1024 * 1024;
  const finalFile = file.size > MAX ? await resizeImageOnClient(file) : file;
  const fd = new FormData();
  fd.set("file", finalFile);
  fd.set("level", LEVEL);
  fd.set("postId", postId);
  const res = await fetch("/api/uploads/images", { method: "POST", body: fd });
  const json = (await res.json()) as { ok: boolean; url?: string; error?: string };
  if (!json.ok || !json.url) {
    throw new Error(json.error || "이미지 업로드에 실패했습니다.");
  }
  return json.url;
}

function formToCard(
  form: {
    visibility: "public" | "private" | "";
    title: string;
    description: string;
    ropeThicknessMm: number | "";
    ropeLengthM: number | "";
    quantity: number | "";
    imageUrl: string;
    extraImageUrls: string[];
    videoUrl: string;
  },
  id: string,
): ClassCardType {
  return {
    id,
    visibility: form.visibility === "" ? undefined : form.visibility,
    title: form.title.trim() || "제목 없음",
    description: (form.description ?? "").trim() || undefined,
    extraImageUrls: form.extraImageUrls,
    ropeThicknessMm: form.ropeThicknessMm === "" ? undefined : form.ropeThicknessMm,
    ropeLengthM: form.ropeLengthM === "" ? undefined : form.ropeLengthM,
    quantity: form.quantity === "" ? undefined : form.quantity,
    imageUrl: form.imageUrl.trim() || null,
  };
}

type FormState = {
  visibility: "public" | "private" | "";
  title: string;
  description: string;
  ropeThicknessMm: number | "";
  ropeLengthM: number | "";
  quantity: number | "";
  imageUrl: string;
  videoUrl: string;
  extraImageUrls: string[];
};

const emptyForm: FormState = {
  visibility: "private",
  title: "",
  description: "",
  ropeThicknessMm: "",
  ropeLengthM: "",
  quantity: "",
  imageUrl: "",
  videoUrl: "",
  extraImageUrls: [],
};

function mapRowsToCards(rows: any[]): ClassCardType[] {
  return rows.map((r) => ({
    id: r.id,
    visibility: (r.visibility ?? undefined) as ClassCardType["visibility"],
    title: r.title,
    description: r.description ?? undefined,
    ropeThicknessMm: r.ropeThicknessMm ?? undefined,
    ropeLengthM: r.ropeLengthM ?? undefined,
    quantity: r.quantity ?? undefined,
    imageUrl: r.coverImageUrl ?? null,
    extraImageUrls: (r.extraImageUrls as string[] | null | undefined) ?? [],
    videoUrl: (r.videoUrl as string | null | undefined) ?? undefined,
  }));
}

export function ClassBeginnerAdmin() {
  const formRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [items, setItems] = useState<ClassCardType[]>([]);
  const [visibilityFilter, setVisibilityFilter] = useState<
    "all" | "public" | "private"
  >("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPhotoIndex, setPreviewPhotoIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [extraFiles, setExtraFiles] = useState<(File | null)[]>([]);
  const [saving, setSaving] = useState(false);

  const focusField = useCallback((id: string) => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    // scrollIntoView 후 포커스가 안정적으로 잡히게 약간 지연
    window.setTimeout(() => {
      const el = document.getElementById(id) as
        | HTMLInputElement
        | HTMLTextAreaElement
        | HTMLSelectElement
        | HTMLDivElement
        | null;
      el?.focus();
    }, 50);
  }, []);

  const applyItemToForm = useCallback((item: ClassCardType) => {
    setForm({
      visibility: item.visibility ?? "",
      title: item.title,
      description: item.description ?? "",
      ropeThicknessMm: item.ropeThicknessMm ?? "",
      ropeLengthM: item.ropeLengthM ?? "",
      quantity: item.quantity ?? "",
      imageUrl: item.imageUrl ?? "",
      videoUrl: item.videoUrl ?? "",
      extraImageUrls: item.extraImageUrls ?? [],
    });
    setCoverFile(null);
    setExtraFiles((item.extraImageUrls ?? []).map(() => null));
    setEditingId(item.id);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const filteredItems = items.filter((item) => {
    if (visibilityFilter === "all") return true;
    if (visibilityFilter === "public") return item.visibility === "public";
    if (visibilityFilter === "private") return item.visibility === "private";
    return true;
  });

  useEffect(() => {
    (async () => {
      const rows = await listClassPostsAction(LEVEL);
      setItems(mapRowsToCards(rows as any[]));
    })().catch(() => {
      // ignore
    });
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setForm(emptyForm);
    setCoverFile(null);
    setExtraFiles([]);
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.imageUrl?.trim()) {
      alert("대표 사진은 필수입니다.");
      focusField("admin-class-image");
      return;
    }
    if (form.visibility === "") {
      alert("공개유무는 필수입니다.");
      focusField("admin-class-visibility");
      return;
    }
    if (!form.title?.trim()) {
      alert("제목은 필수입니다.");
      focusField("admin-class-title");
      return;
    }
    if (form.ropeThicknessMm === "" || form.ropeLengthM === "" || form.quantity === "") {
      alert("로프(두께/길이/수량)는 필수입니다.");
      if (form.ropeThicknessMm === "") focusField("admin-class-thickness");
      else if (form.ropeLengthM === "") focusField("admin-class-length");
      else focusField("admin-class-quantity");
      return;
    }
    if (!form.description?.trim()) {
      alert("설명은 필수입니다.");
      focusField("admin-class-description");
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      const id = editingId ?? `cls_${crypto.randomUUID()}`;
      const coverUrl = coverFile
        ? await uploadImageToS3(coverFile, id)
        : form.imageUrl;

      const extraUrls: string[] = [];
      for (let i = 0; i < form.extraImageUrls.length; i += 1) {
        const existingOrPreview = form.extraImageUrls[i];
        const file = extraFiles[i] ?? null;
        if (file) {
          extraUrls.push(await uploadImageToS3(file, id));
        } else if (existingOrPreview?.startsWith("http")) {
          extraUrls.push(existingOrPreview);
        }
      }

      if (editingId) {
        const result = await updateClassPostAction({
          id,
          visibility: form.visibility as "public" | "private",
          title: form.title.trim(),
          description: form.description.trim(),
          ropeThicknessMm: Number(form.ropeThicknessMm),
          ropeLengthM: Number(form.ropeLengthM),
          quantity: Number(form.quantity),
          coverImageUrl: coverUrl,
          extraImageUrls: extraUrls,
          videoUrl: form.videoUrl?.trim() ? form.videoUrl.trim() : null,
        });
        if (!result.ok) throw new Error(result.error);
      } else {
        const result = await createClassPostAction({
          id,
          level: LEVEL,
          visibility: form.visibility as "public" | "private",
          title: form.title.trim(),
          description: form.description.trim(),
          ropeThicknessMm: Number(form.ropeThicknessMm),
          ropeLengthM: Number(form.ropeLengthM),
          quantity: Number(form.quantity),
          coverImageUrl: coverUrl,
          extraImageUrls: extraUrls,
          videoUrl: form.videoUrl?.trim() ? form.videoUrl.trim() : null,
        });
        if (!result.ok) throw new Error(result.error);
      }

      const rows = await listClassPostsAction(LEVEL);
      setItems(mapRowsToCards(rows as any[]));
      handleCancelEdit();
    } catch (e) {
      alert(e instanceof Error ? e.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }, [coverFile, editingId, extraFiles, focusField, form, handleCancelEdit, saving]);

  const previewCard = formToCard(form, "preview");
  const hasCoverPhoto = !!form.imageUrl?.trim();
  const previewPhotos = [
    hasCoverPhoto ? form.imageUrl.trim() : null,
    ...form.extraImageUrls,
  ].filter((v): v is string => !!v);
  const extraPhotoOffset = hasCoverPhoto ? 1 : 0;
  const canGoPrev = previewPhotos.length > 1 && previewPhotoIndex > 0;
  const canGoNext =
    previewPhotos.length > 1 && previewPhotoIndex < previewPhotos.length - 1;

  const goPrev = useCallback(() => {
    if (!canGoPrev) return;
    setPreviewPhotoIndex((i) => Math.max(0, i - 1));
  }, [canGoPrev]);

  const goNext = useCallback(() => {
    if (!canGoNext) return;
    setPreviewPhotoIndex((i) => Math.min(previewPhotos.length - 1, i + 1));
  }, [canGoNext, previewPhotos.length]);

  useEffect(() => {
    if (!previewOpen || previewPhotos.length <= 1) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, previewOpen, previewPhotos.length]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">클래스 · 초급</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          초급 클래스 게시물을 등록·관리합니다. 목록에서 수정 버튼을 누르면 상단 폼에 적용됩니다.
        </p>
      </div>

      {/* 등록 영역: 좌측 대표사진(이미지 형태) | 우측 추가 등록 정보 */}
      <section
        ref={formRef}
        className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-muted/20 p-4 sm:p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]"
      >
        {/* 좌측: 대표 사진 (파일 선택) */}
        <div className="space-y-3">
          <h3 className="font-medium">
            대표 사진 <span className="text-red-600">*</span>
          </h3>
          <input
            id="admin-class-image"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setCoverFile(file);
              const reader = new FileReader();
              reader.onload = () => setForm((f) => ({ ...f, imageUrl: String(reader.result) }));
              reader.readAsDataURL(file);
              e.target.value = "";
            }}
          />
          <label
            htmlFor="admin-class-image"
            className="relative flex aspect-square w-full max-w-sm cursor-pointer overflow-hidden rounded-lg border border-border bg-muted/30 md:max-w-none"
          >
            {form.imageUrl?.trim() ? (
              <img src={form.imageUrl} alt="" className="size-full object-cover" />
            ) : (
              <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
                <span className="text-sm">파일 선택</span>
                <span className="text-xs">이미지를 선택하세요</span>
              </div>
            )}
          </label>
        </div>

        {/* 우측: 추가 등록 정보 */}
        <div className="flex flex-col gap-3">
          <h3 className="font-medium">{editingId ? "수정" : "등록"}</h3>
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 items-center">
            <Label htmlFor="admin-class-visibility" className="min-w-[7rem]">
              공개유무 <span className="text-red-600">*</span>
            </Label>
            <div id="admin-class-visibility" tabIndex={-1}>
              <ToggleGroup
                type="single"
                value={form.visibility}
                onValueChange={(v) => {
                  setForm((f) => ({ ...f, visibility: v as "public" | "private" | "" }));
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
            </div>
            <Label htmlFor="admin-class-title" className="min-w-[7rem]">
              제목 <span className="text-red-600">*</span>
            </Label>
            <div className="relative">
              <Input
                id="admin-class-title"
                value={form.title}
                maxLength={TITLE_MAX_LEN}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value.slice(0, TITLE_MAX_LEN) }))
                }
                placeholder="예: 3가지 유용한 로프 길이 및 두께"
                className="pr-14"
              />
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {form.title.length}/{TITLE_MAX_LEN}
              </span>
            </div>
            <span className="min-w-[7rem] text-sm font-medium">
              로프 <span className="text-red-600">*</span>
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-muted-foreground">두께</span>
                <select
                  id="admin-class-thickness"
                  value={form.ropeThicknessMm}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      ropeThicknessMm: e.target.value === "" ? "" : Number(e.target.value),
                    }))
                  }
                  className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="로프 두께 선택"
                >
                  <option value="">-</option>
                  {ROPE_THICKNESS.map((n) => (
                    <option key={n} value={n}>
                      {n}mm
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-muted-foreground">길이</span>
                <select
                  id="admin-class-length"
                  value={form.ropeLengthM}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      ropeLengthM: e.target.value === "" ? "" : Number(e.target.value),
                    }))
                  }
                  className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="길이 선택"
                >
                  <option value="">-</option>
                  {ROPE_LENGTH.map((n) => (
                    <option key={n} value={n}>
                      {n}m
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-muted-foreground">수량</span>
                <select
                  id="admin-class-quantity"
                  value={form.quantity}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      quantity: e.target.value === "" ? "" : Number(e.target.value),
                    }))
                  }
                  className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="수량 선택"
                >
                  <option value="">-</option>
                  {QUANTITY.map((n) => (
                    <option key={n} value={n}>
                      {n}개
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Label htmlFor="admin-class-description" className="min-w-[7rem]">
              설명 <span className="text-red-600">*</span>
            </Label>
            <div className="relative">
              <Textarea
                id="admin-class-description"
                value={form.description}
                maxLength={DESCRIPTION_MAX_LEN}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    description: e.target.value.slice(0, DESCRIPTION_MAX_LEN),
                  }))
                }
                placeholder="클래스 설명을 입력하세요."
                className="min-h-24 pb-7"
              />
              <span className="pointer-events-none absolute bottom-2 right-2 text-xs text-muted-foreground">
                {form.description.length}/{DESCRIPTION_MAX_LEN}
              </span>
            </div>
            <Label htmlFor="admin-class-video" className="min-w-[7rem]">동영상 URL</Label>
            <Input
              id="admin-class-video"
              value={form.videoUrl}
              onChange={(e) => setForm((f) => ({ ...f, videoUrl: e.target.value }))}
              placeholder="https://..."
            />
            <Label htmlFor="admin-class-extra-images" className="min-w-[7rem]">추가 이미지</Label>
            <div className="space-y-2">
              <input
                id="admin-class-extra-images"
                type="file"
                accept="image/*"
                multiple
                disabled={form.extraImageUrls.length >= MAX_EXTRA_IMAGES}
                className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-muted"
                onChange={async (e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (files.length === 0) return;
                  const current = form.extraImageUrls.length;
                  const remain = MAX_EXTRA_IMAGES - current;
                  if (remain <= 0) {
                    e.target.value = "";
                    return;
                  }
                  const picked = files.slice(0, remain);
                  const urls = await Promise.all(picked.map(readFileAsDataUrl));
                  setForm((prev) => ({
                    ...prev,
                    extraImageUrls: [...prev.extraImageUrls, ...urls],
                  }));
                  setExtraFiles((prev) => [...prev, ...picked.map((f) => f)]);
                  e.target.value = "";
                }}
              />
              <p className="text-xs text-muted-foreground">
                최대 {MAX_EXTRA_IMAGES}장 ({form.extraImageUrls.length}/{MAX_EXTRA_IMAGES})
              </p>
              {form.extraImageUrls.length > 0 && (
                <div className="grid grid-cols-6 gap-2">
                  {form.extraImageUrls.map((url) => (
                    <button
                      key={url}
                      type="button"
                      className="group relative aspect-square overflow-hidden rounded-md border border-border bg-muted/20"
                      onClick={() => {
                        setForm((prev) => {
                          const nextUrls = prev.extraImageUrls.filter((u) => u !== url);
                          return { ...prev, extraImageUrls: nextUrls };
                        });
                        setExtraFiles((prev) => {
                          const idx = prev.findIndex((_, i) => form.extraImageUrls[i] === url);
                          if (idx < 0) return prev;
                          return prev.filter((_, i) => i !== idx);
                        });
                      }}
                      aria-label="추가 이미지 제거"
                      title="클릭해서 제거"
                    >
                      <img src={url} alt="" className="size-full object-cover" />
                      <div className="pointer-events-none absolute inset-0 hidden bg-black/30 group-hover:block" />
                      <span className="pointer-events-none absolute right-1 top-1 hidden rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white group-hover:block">
                        삭제
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </section>

      {/* 폼 바깥 버튼 */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-w-32 px-8 border-emerald-500/70 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
            onClick={() => {
              setPreviewPhotoIndex(0);
              setPreviewOpen(true);
            }}
          >
            <CircleCheck className="mr-2 size-4" aria-hidden="true" />
            미리보기
          </Button>
        </div>
        <div className="w-6" aria-hidden="true" />
        <div className="flex justify-start gap-2">
          <Button
            type="button"
            size="sm"
            className="bg-blue-600 text-white hover:bg-blue-700"
            onClick={handleSave}
            disabled={saving}
          >
            {editingId ? "수정 저장" : "등록"}
          </Button>
          {editingId && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => {
                setDeleteOpen(true);
              }}
            >
              삭제
            </Button>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={handleCancelEdit}>
            취소
          </Button>
        </div>
      </div>

      {/* 구분선 */}
      <hr className="border-border" />

      {/* 등록된 목록 */}
      <section className="space-y-4">
        <h3 className="font-medium">등록 목록</h3>
        <ToggleGroup
          type="single"
          value={visibilityFilter}
          onValueChange={(v) => {
            if (!v) return;
            setVisibilityFilter(v as "all" | "public" | "private");
          }}
          className="mb-2"
          aria-label="공개 여부로 필터"
        >
          <ToggleGroupItem value="all">전체</ToggleGroupItem>
          <ToggleGroupItem value="public">공개</ToggleGroupItem>
          <ToggleGroupItem value="private">비공개</ToggleGroupItem>
        </ToggleGroup>
        {filteredItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            등록된 항목이 없습니다. 위 폼에서 등록 후 목록에 표시됩니다.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredItems.map((item) => (
              <div key={item.id} className="relative">
                <button
                  type="button"
                  onClick={() => applyItemToForm(item)}
                  className="block w-full rounded-xl border border-border bg-card overflow-hidden shadow-sm text-left transition-colors hover:bg-muted/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label="목록 항목을 수정 폼에 적용"
                >
                  <ClassCard card={item} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 미리보기 다이얼로그 */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent
          className={[
            "flex max-h-[95dvh] w-full flex-col overflow-hidden p-1.5 sm:p-2",
            "max-w-[calc(100vw-1rem)] sm:max-w-xl md:max-w-2xl",
            "overflow-y-auto",
          ].join(" ")}
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle className="sr-only">미리보기</DialogTitle>
            <DialogDescription className="sr-only">
              클래스 게시물 미리보기입니다.
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col space-y-2 sm:space-y-3">
            <p className="shrink-0 text-sm font-medium text-foreground">
              {form.title?.trim() || "제목 없음"}
            </p>

            {/* 사진(대표사진 먼저, 이후 추가 이미지) */}
            <div className="relative flex flex-col items-center justify-center">
              <div className="flex w-full max-w-full items-center justify-center gap-1 sm:gap-2">
                {previewPhotos.length > 1 && (
                  <div className="flex w-7 shrink-0 flex-col items-center justify-center sm:w-8">
                    {canGoPrev ? (
                      <button
                        type="button"
                        onClick={goPrev}
                        aria-label="이전 사진"
                        className="flex h-9 w-7 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-muted/80 hover:text-foreground sm:h-10 sm:w-8"
                      >
                        <ChevronLeft className="size-5 sm:size-6" strokeWidth={1.5} />
                      </button>
                    ) : (
                      <span className="h-9 w-7 sm:h-10 sm:w-8" aria-hidden />
                    )}
                  </div>
                )}

                <div
                  className="flex min-h-0 min-w-0 flex-1 touch-pan-y select-none justify-center overflow-hidden"
                  onTouchStart={(e) => {
                    touchStartX.current =
                      e.changedTouches[0]?.clientX ?? e.touches[0]?.clientX ?? null;
                  }}
                  onTouchEnd={(e) => {
                    const start = touchStartX.current;
                    if (start == null || previewPhotos.length <= 1) return;
                    const end =
                      e.changedTouches[0]?.clientX ?? e.touches[0]?.clientX ?? start;
                    const delta = start - end;
                    if (delta > 50) goNext();
                    else if (delta < -50) goPrev();
                    touchStartX.current = null;
                  }}
                >
                  {previewPhotos[previewPhotoIndex] ? (
                    <div className="relative flex w-full justify-center">
                      <div className="flex w-full justify-center">
                        <img
                          src={previewPhotos[previewPhotoIndex]!}
                          alt=""
                          className="h-auto w-full max-h-[50dvh] object-contain object-center"
                          draggable={false}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-56 w-full items-center justify-center text-muted-foreground">
                      <span className="text-sm">대표사진 없음</span>
                    </div>
                  )}
                </div>

                {previewPhotos.length > 1 && (
                  <div className="flex w-7 shrink-0 flex-col items-center justify-center sm:w-8">
                    {canGoNext ? (
                      <button
                        type="button"
                        onClick={goNext}
                        aria-label="다음 사진"
                        className="flex h-9 w-7 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-muted/80 hover:text-foreground sm:h-10 sm:w-8"
                      >
                        <ChevronRight className="size-5 sm:size-6" strokeWidth={1.5} />
                      </button>
                    ) : (
                      <span className="h-9 w-7 sm:h-10 sm:w-8" aria-hidden />
                    )}
                  </div>
                )}
              </div>

              {previewPhotos.length > 1 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {previewPhotoIndex + 1} / {previewPhotos.length}
                </p>
              )}
            </div>

            {/* 추가 이미지 썸네일 (동영상 다음) */}
            {form.extraImageUrls.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-sm font-medium">추가 이미지</p>
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                  {form.extraImageUrls.map((url, idx) => (
                    <button
                      key={url}
                      type="button"
                      className="aspect-square overflow-hidden rounded-md border border-border bg-muted/20"
                      onClick={() => setPreviewPhotoIndex(extraPhotoOffset + idx)}
                      aria-label="추가 이미지로 이동"
                    >
                      <img src={url} alt="" className="size-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 설명 */}
            {form.description?.trim() && (
              <div className="max-h-[30dvh] overflow-y-auto rounded-xl border border-border bg-card p-4">
                <p className="text-sm font-medium">설명</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                  {form.description}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 (2단계) */}
      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader className="place-items-center text-center sm:place-items-center sm:text-center">
            <AlertDialogTitle className="sr-only">삭제 확인</AlertDialogTitle>
            <AlertDialogDescription className="flex flex-col items-center justify-center gap-2 text-center">
              <span className="max-w-[22rem] text-base leading-relaxed text-foreground">
                완전히 <span className="text-red-600 font-semibold">삭제</span>하면 복구할 수 없습니다.
              </span>
              <span className="text-base font-semibold text-foreground">
                <span className="text-red-600 font-semibold">삭제</span> 하시겠습니까?
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogCancel>
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!editingId) return;
                const res = await deleteClassPostAction(editingId);
                if (!res.ok) {
                  alert(res.error);
                  return;
                }
                const rows = await listClassPostsAction(LEVEL);
                setItems(mapRowsToCards(rows as any[]));
                setDeleteOpen(false);
                handleCancelEdit();
              }}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
