"use client";

import { useState, useCallback, type RefObject } from "react";
import { toPng } from "html-to-image";
import { useI18n } from "@/app/i18n";

type Props = {
  /** 目标 DOM 元素的 ref */
  targetRef: RefObject<HTMLDivElement | null>;
};

export default function SavePngButton({ targetRef }: Props) {
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

    try {
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
      setSaving(false);
    }
  }, [targetRef, saving, t]);

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
