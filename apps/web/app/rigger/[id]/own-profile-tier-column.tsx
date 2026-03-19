"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RiggerTierCard } from "@/components/rigger-tier-card";
import { Button } from "@workspace/ui/components/button";
import type { Rigger } from "@/lib/rigger-sample";
import {
  PROFILE_EDITING_EVENT,
} from "./profile-editing-events";
import { saveRiggerProfile } from "./rigger-profile-actions";
import { uploadRiggerMarkImage } from "./mark-upload-actions";
import { resizeImageOnClient } from "@/lib/image/resize-client";

type OwnProfileTierColumnProps = {
  rigger: Rigger;
  /** 계정 사용 제한 중이면 사진 등록 버튼 숨김 */
  isSuspended?: boolean;
  /** 계정 사용 제한 시 카드 위 감옥 이미지 URL */
  jailOverlayUrl?: string | null;
  /** 정지 해제 예정 시각 ISO. 상세보기에서 남은 시간 표시용 */
  suspendedUntil?: string | null;
};

export function OwnProfileTierColumn({ rigger, isSuspended, jailOverlayUrl, suspendedUntil }: OwnProfileTierColumnProps) {
  const router = useRouter();
  const [isProfileEditing, setIsProfileEditing] = useState(false);
  const initialUrl = rigger.markImageUrl?.trim() || "";
  /** 저장 대기 중인 로컬 파일 (저장 시 업로드) */
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  /** 이미 업로드된 URL만 바뀐 경우(동일 세션에서 재저장 등) */
  const [pendingUrl, setPendingUrl] = useState(initialUrl);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // 저장 후 refresh 등으로 서버 마크 URL이 바뀌면, 편집 중이 아닐 때만 동기화 (값이 실제로 다를 때만 setState로 루프 방지)
  useEffect(() => {
    if (pendingFile !== null) return;
    setPendingUrl((prev) => (prev !== initialUrl ? initialUrl : prev));
  }, [initialUrl, pendingFile]);

  useEffect(() => {
    if (!pendingFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  const displayMarkUrl = previewUrl ?? (pendingUrl || null);
  const dirty = pendingFile !== null || pendingUrl !== initialUrl;
  const displayRigger: Rigger = {
    ...rigger,
    markImageUrl: displayMarkUrl,
  };

  async function handleSave() {
    setSaving(true);
    try {
      let url = pendingUrl;
      if (pendingFile) {
        const MAX = 4 * 1024 * 1024;
        const finalFile = pendingFile.size > MAX ? await resizeImageOnClient(pendingFile) : pendingFile;
        const fd = new FormData();
        fd.append("image", finalFile);
        const up = await uploadRiggerMarkImage(rigger.id, fd);
        if (!up.ok) {
          alert(up.error);
          setSaving(false);
          return;
        }
        url = up.url;
        setPendingFile(null);
        setPendingUrl(url);
      }
      const res = await saveRiggerProfile(rigger.id, {
        markImageUrl: url || null,
      });
      if (res.ok) router.refresh();
      else alert(res.error);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setPendingFile(null);
    setPendingUrl(initialUrl);
  }

  // 정보수정 편집 모드 이벤트 구독
  useEffect(() => {
    const onEditing = (e: Event) => {
      const ce = e as CustomEvent<{ editing: boolean }>;
      setIsProfileEditing(Boolean(ce.detail?.editing));
    };
    window.addEventListener(PROFILE_EDITING_EVENT, onEditing);
    return () => window.removeEventListener(PROFILE_EDITING_EVENT, onEditing);
  }, []);

  // 정보수정을 닫으면 마크 미저장 변경은 취소
  useEffect(() => {
    if (!isProfileEditing) {
      setPendingFile(null);
      setPendingUrl((prev) => (prev !== initialUrl ? initialUrl : prev));
    }
  }, [isProfileEditing, initialUrl]);

  return (
    <div className="flex h-full w-full max-w-[280px] flex-col gap-1 sm:col-start-1 sm:row-start-1 sm:justify-start">
      <div className="w-full">
        <RiggerTierCard
          rigger={isProfileEditing ? displayRigger : rigger}
          markPick={
            isProfileEditing
              ? { onChooseImage: (file) => setPendingFile(file) }
              : undefined
          }
          jailOverlayUrl={jailOverlayUrl}
          suspendedUntil={suspendedUntil}
        />
      </div>
      {dirty ? (
        <div className="grid w-full grid-cols-3 gap-1">
          <Button
            type="button"
            className="col-span-2 bg-blue-600 font-medium text-white hover:bg-blue-700"
            size="sm"
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? "저장 중…" : "저장"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="col-span-1"
            disabled={saving}
            onClick={handleCancel}
          >
            취소
          </Button>
        </div>
      ) : !isSuspended ? (
        <Button asChild className="w-full" size="sm">
          <Link href={`/rigger/${encodeURIComponent(rigger.id)}/photos`}>
            사진 등록
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
