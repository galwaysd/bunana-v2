"use client";

import { useRef, useState } from "react";
import { readImagePayload } from "@/app/lib/image";
import { useI18n } from "@/app/i18n";
import type { ImagePayload } from "@/app/types";

type Props = {
  images: ImagePayload[];
  onImagesChange: (images: ImagePayload[]) => void;
  onRemoveImage?: (index: number) => void;
  disabled?: boolean;
};

export default function ImageUploader({
  images,
  onImagesChange,
  onRemoveImage,
  disabled
}: Props) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const readingRef = useRef(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const locked = disabled || reading;

  const maxImages = 3;
  const remaining = maxImages - images.length;

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || readingRef.current) return;
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    // 只取还能容纳的数量
    const toAdd = files.slice(0, remaining);
    if (toAdd.length === 0) return;

    readingRef.current = true;
    setReading(true);
    setError("");
    try {
      const payloads = await Promise.all(toAdd.map(readImagePayload));
      // 前端去重：相同 imageHash 跳过
      const existing = new Set(images.map((img) => img.imageHash));
      const unique = payloads.filter((p) => {
        if (existing.has(p.imageHash)) return false;
        existing.add(p.imageHash);
        return true;
      });
      onImagesChange([...images, ...unique]);
    } catch {
      setError(t("imageUploader.readError"));
    } finally {
      readingRef.current = false;
      setReading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = (index: number) => {
    if (onRemoveImage) {
      onRemoveImage(index);
    } else {
      onImagesChange(images.filter((_, i) => i !== index));
    }
  };

  return (
    <div className={`image-uploader${images.length > 0 ? " has-images" : ""}`} aria-busy={reading}>
      {images.map((img, i) => (
        <div
          key={`${img.imageHash}-${i}`}
          className="image-uploader-preview"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img.dataUrl}
            alt={img.name}
            className="image-uploader-preview-image"
          />
          <button
            type="button"
            onClick={() => handleRemove(i)}
            disabled={locked}
            className="image-uploader-remove"
            title={t("imageUploader.remove")}
          >
            ×
          </button>
        </div>
      ))}

      {remaining > 0 && (
        <label
          className={`image-uploader-add${locked ? " is-disabled" : ""}`}
          title={t("imageUploader.uploadHint")}
        >
          <span className="image-uploader-add-icon" aria-hidden="true">+</span>
          <span className="image-uploader-add-label">{t("imageUploader.uploadAction")}</span>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleChange}
            disabled={locked}
            style={{ display: "none" }}
          />
        </label>
      )}

      {images.length === 0 && (
        <span className="image-uploader-prompt">
          {t("imageUploader.uploadPrompt")}
        </span>
      )}
      {error && <span role="alert" style={{ flexBasis: "100%", overflowWrap: "anywhere" }}>{error}</span>}
    </div>
  );
}
