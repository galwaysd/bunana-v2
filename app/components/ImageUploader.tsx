"use client";

import { useRef } from "react";
import { readImagePayload } from "@/app/lib/image";
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
  const inputRef = useRef<HTMLInputElement>(null);

  const maxImages = 3;
  const remaining = maxImages - images.length;

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    // 只取还能容纳的数量
    const toAdd = files.slice(0, remaining);
    if (toAdd.length === 0) return;

    try {
      const payloads = await Promise.all(toAdd.map(readImagePayload));
      // 前端去重：相同 imageHash 跳过
      const existing = new Set(images.map((img) => img.imageHash));
      const unique = payloads.filter((p) => !existing.has(p.imageHash));
      onImagesChange([...images, ...unique]);
    } catch {
      // 图片读取失败静默处理
    }

    // 清空 input 以支持重复选择同一个文件
    if (inputRef.current) {
      inputRef.current.value = "";
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
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0.5rem",
        padding: "0.75rem",
        border: "2px dashed #ddd",
        borderRadius: "8px",
        background: "#fafafa",
        minHeight: "100px",
        alignItems: "center"
      }}
    >
      {images.map((img, i) => (
        <div
          key={`${img.imageHash}-${i}`}
          style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img.dataUrl}
            alt={img.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              borderRadius: "4px",
              border: "1px solid #e0e0e0"
            }}
          />
          <button
            onClick={() => handleRemove(i)}
            disabled={disabled}
            style={{
              position: "absolute",
              top: -6,
              right: -6,
              width: 20,
              height: 20,
              borderRadius: "50%",
              border: "1px solid #ccc",
              background: "#fff",
              cursor: "pointer",
              fontSize: "12px",
              lineHeight: "18px",
              textAlign: "center",
              padding: 0
            }}
            title="移除"
          >
            ×
          </button>
        </div>
      ))}

      {remaining > 0 && (
        <label
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 80,
            height: 80,
            border: "2px dashed #ccc",
            borderRadius: "4px",
            cursor: disabled ? "not-allowed" : "pointer",
            color: "#999",
            fontSize: "28px",
            opacity: disabled ? 0.4 : 1
          }}
          title="点击上传图片"
        >
          +
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleChange}
            disabled={disabled}
            style={{ display: "none" }}
          />
        </label>
      )}

      {images.length === 0 && (
        <span style={{ color: "#999", fontSize: "0.875rem" }}>
          上传 1-3 张布料照片
        </span>
      )}
    </div>
  );
}
