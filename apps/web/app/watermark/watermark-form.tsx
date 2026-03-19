"use client";

import { useCallback, useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { resizeImageOnClient } from "@/lib/image/resize-client";
import { Label } from "@workspace/ui/components/label";
import { RadioGroup, RadioGroupItem } from "@workspace/ui/components/radio-group";
import { Slider } from "@workspace/ui/components/slider";
import type { WatermarkConfig } from "@/lib/watermark-config";
import { saveWatermarkConfig, uploadWatermarkImage } from "./actions";

const SAMPLE_IMAGE_SRC = "/watermark-preview-sample.jpg";

type Props = { initialConfig: WatermarkConfig };

export function WatermarkForm({ initialConfig }: Props) {
  const [type, setType] = useState<"text" | "image">(initialConfig.type);
  const [text, setText] = useState(initialConfig.text);
  const [positionX, setPositionX] = useState(initialConfig.positionX);
  const [positionY, setPositionY] = useState(initialConfig.positionY);
  const [opacity, setOpacity] = useState(initialConfig.opacity);
  const [scale, setScale] = useState(initialConfig.scale ?? 1);
  const [rotation, setRotation] = useState(initialConfig.rotation ?? 0);
  const [imagePath, setImagePath] = useState(initialConfig.imagePath ?? "/watermark.png");
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(
    initialConfig.type === "image" ? (initialConfig.imagePath ?? "/watermark.png") : null,
  );
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sampleError, setSampleError] = useState(false);

  const markDirty = useCallback(() => setDirty(true), []);

  const handleTypeChange = (value: string) => {
    const v = value as "text" | "image";
    setType(v);
    if (v === "image") setImagePreviewUrl(imagePath || "/watermark.png");
    else setImagePreviewUrl(null);
    markDirty();
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    markDirty();
  };

  const handlePositionXChange = (value: number[]) => {
    setPositionX(value[0] ?? 0);
    markDirty();
  };

  const handlePositionYChange = (value: number[]) => {
    setPositionY(value[0] ?? 0);
    markDirty();
  };

  const handleOpacityChange = (value: number[]) => {
    setOpacity(value[0] ?? 0.6);
    markDirty();
  };

  const handleScaleChange = (value: number[]) => {
    setScale(value[0] ?? 1);
    markDirty();
  };

  const handleRotationChange = (value: number[]) => {
    setRotation(value[0] ?? 0);
    markDirty();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const config: WatermarkConfig = {
        type,
        text,
        positionX,
        positionY,
        opacity,
        scale,
        rotation,
        imagePath: type === "image" ? imagePath : undefined,
      };
      const result = await saveWatermarkConfig(config);
      if (result.ok) {
        setDirty(false);
      } else {
        alert(result.error);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const MAX = 4 * 1024 * 1024;
    const finalFile = file.size > MAX ? await resizeImageOnClient(file) : file;
    const fd = new FormData();
    fd.set("image", finalFile);
    const result = await uploadWatermarkImage(fd);
    if (result.ok) {
      setImagePreviewUrl(`${result.url}?t=${Date.now()}`);
      setImagePath(result.url);
      markDirty();
    } else {
      alert(result.error);
    }
    e.target.value = "";
  };

  const POSITION_MIN = 0.1;
  const POSITION_MAX = 0.9;
  const displayX = POSITION_MIN + positionX * (POSITION_MAX - POSITION_MIN);
  const displayY = POSITION_MIN + positionY * (POSITION_MAX - POSITION_MIN);

  return (
    <div className="mt-6 flex flex-col gap-6 sm:flex-row">
      {/* 왼쪽: 미리보기 + 저장 버튼 */}
      <div className="flex shrink-0 flex-col gap-3 sm:w-96">
        <div className="relative h-64 w-full overflow-hidden rounded-lg border bg-muted sm:h-80 md:h-96">
          {sampleError ? (
            <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
              샘플 이미지 영역
            </div>
          ) : (
            <img
              src={SAMPLE_IMAGE_SRC}
              alt="미리보기 샘플"
              className="h-full w-full object-cover"
              onError={() => setSampleError(true)}
            />
          )}
          {/* 워터마크 오버레이 (inset-0 미사용 → 콘텐츠만 크기, 텍스트 노출) */}
          <div
            className="pointer-events-none absolute"
            style={{
              left: `${displayX * 100}%`,
              top: `${displayY * 100}%`,
              transform: `translate(-50%, -50%) scale(${scale}) rotate(${rotation}deg)`,
            }}
          >
            {type === "text" ? (
              <span
                className="whitespace-nowrap text-sm font-medium text-white drop-shadow-md"
                style={{ opacity }}
              >
                {text || "워터마크"}
              </span>
            ) : (
              imagePreviewUrl && (
                <img
                  src={imagePreviewUrl}
                  alt="워터마크"
                  className="h-8 w-auto max-w-[120px] object-contain drop-shadow-md"
                  style={{ opacity }}
                />
              )
            )}
          </div>
          {dirty && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="min-w-48 bg-primary/90 px-8 backdrop-blur-sm hover:bg-primary"
              >
                {saving ? "저장 중…" : "저장"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 오른쪽: 조절 컨트롤 */}
      <div className="flex flex-1 flex-col gap-4">
        <div>
          <Label className="mb-2 block">워터마크 유형</Label>
          <RadioGroup value={type} onValueChange={handleTypeChange} className="flex gap-4">
            <label className="flex cursor-pointer items-center gap-2">
              <RadioGroupItem value="text" />
              <span>텍스트</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <RadioGroupItem value="image" />
              <span>이미지</span>
            </label>
          </RadioGroup>
        </div>

        {type === "text" && (
          <div>
            <Label htmlFor="wm-text" className="mb-2 block">
              워터마크 문구
            </Label>
            <Input
              id="wm-text"
              value={text}
              onChange={handleTextChange}
              placeholder="표시할 텍스트"
            />
          </div>
        )}

        {type === "image" && (
          <div>
            <Label className="mb-2 block">이미지 업로드</Label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="text-sm file:mr-2 file:rounded file:border file:px-3 file:py-1 file:text-sm"
            />
          </div>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label>투명도</Label>
            <span className="text-xs text-muted-foreground">{Math.round((1 - opacity) * 100)}%</span>
          </div>
          <Slider
            min={0}
            max={1}
            step={0.05}
            value={[opacity]}
            onValueChange={handleOpacityChange}
            className="w-full"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label>크기</Label>
            <span className="text-xs text-muted-foreground">{Math.round(scale * 100)}%</span>
          </div>
          <Slider
            min={0.3}
            max={3}
            step={0.1}
            value={[scale]}
            onValueChange={handleScaleChange}
            className="w-full"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label>좌 - 우</Label>
            <span className="text-xs text-muted-foreground">{Math.round(positionX * 100)}%</span>
          </div>
          <Slider
            min={0}
            max={1}
            step={0.05}
            value={[positionX]}
            onValueChange={handlePositionXChange}
            className="w-full"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label>상 - 하</Label>
            <span className="text-xs text-muted-foreground">{Math.round(positionY * 100)}%</span>
          </div>
          <Slider
            min={0}
            max={1}
            step={0.05}
            value={[positionY]}
            onValueChange={handlePositionYChange}
            className="w-full"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label>회전</Label>
            <span className="text-xs text-muted-foreground">{rotation}°</span>
          </div>
          <Slider
            min={0}
            max={360}
            step={15}
            value={[rotation]}
            onValueChange={handleRotationChange}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}
