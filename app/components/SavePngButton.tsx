"use client";

import { useState, useCallback, type RefObject } from "react";
import { toPng } from "html-to-image";
import { useI18n } from "@/app/i18n";
import type { CardMode } from "./FabricDNACard";

type Props = {
  /** 目标 DOM 元素的 ref */
  targetRef: RefObject<HTMLDivElement | null>;
  /** 当前卡片模式 */
  cardMode?: CardMode;
  /** 改变卡片模式的回调函数 */
  onCardModeChange?: (mode: CardMode) => void;
};

export default function SavePngButton({ targetRef, cardMode = "edit", onCardModeChange }: Props) {
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = useCallback(async () => {
    if (!targetRef.current) {
      setError(t("savePng.cardNotReady"));
      return;
    }
    if (saving) return;

    setSaving(true);
    setError("");

    // 如果当前是编辑模式，导出前临时切换到预览模式
    const needsMode = cardMode !== "preview";
    const originalMode = cardMode;

    try {
      // 临时切换到预览模式（如果需要）
      if (needsMode && onCardModeChange) {
        onCardModeChange("preview");
        // 给 React 一点时间来更新 DOM
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const dataUrl = await toPng(targetRef.current, {
        backgroundColor: "#ffffff",
        pixelRatio: 2, // 2x 清晰度
        cacheBust: true
      });

      const timestamp = new Date()
        .toISOString()
        .replace(/:/g, "-")
        .replace(/\..+$/, "");
      const filename = `Bunana-Fabric-DNA-${timestamp}.png`;

      const link = document.createElement("a");
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("PNG export failed:", e);
      setError(t("savePng.exportError"));
    } finally {
      // 恢复到原来的模式
      if (needsMode && onCardModeChange) {
        onCardModeChange(originalMode);
      }
      setSaving(false);
    }
  }, [targetRef, saving, t, cardMode, onCardModeChange]);

  return (
    <div style={{ marginTop: "0.75rem" }}>
      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          width: "100%",
          padding: "0.75rem",
          border: "none",
          borderRadius: "8px",
          fontSize: "1rem",
          fontWeight: 600,
          cursor: saving ? "wait" : "pointer",
          background: saving ? "#c8e6c9" : "#4a6741",
          color: "#fff",
          transition: "background 0.2s"
        }}
      >
        {saving ? t("savePng.saving") : t("savePng.save")}
      </button>
      {error && (
        <div
          style={{
            marginTop: "0.5rem",
            padding: "0.5rem 0.75rem",
            borderRadius: "6px",
            background: "#fff0f0",
            border: "1px solid #ffcdd2",
            color: "#c62828",
            fontSize: "0.85rem"
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
