"use client";

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
  type RefObject
} from "react";
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

export type SavePngHandle = {
  save: () => Promise<boolean>;
};

function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

async function waitForCardImages(target: HTMLDivElement): Promise<void> {
  const images = Array.from(target.querySelectorAll("img"));

  await Promise.all(
    images.map(async (image) => {
      if (!image.complete) {
        await new Promise<void>((resolve, reject) => {
          const cleanup = () => {
            image.removeEventListener("load", handleLoad);
            image.removeEventListener("error", handleError);
          };
          const handleLoad = () => {
            cleanup();
            resolve();
          };
          const handleError = () => {
            cleanup();
            reject(new Error("Card image failed to load"));
          };

          image.addEventListener("load", handleLoad, { once: true });
          image.addEventListener("error", handleError, { once: true });

          // 图片可能在 complete 检查与监听器注册之间完成加载。
          if (image.complete) {
            if (image.naturalWidth > 0) {
              handleLoad();
            } else {
              handleError();
            }
          }
        });
      }

      if (image.naturalWidth === 0) {
        throw new Error("Card image is not available for export");
      }

      if (typeof image.decode === "function") {
        try {
          await image.decode();
        } catch {
          if (image.naturalWidth === 0) {
            throw new Error("Card image could not be decoded");
          }
        }
      }
    })
  );
}

const SavePngButton = forwardRef<SavePngHandle, Props>(function SavePngButton(
  { targetRef, cardMode = "edit", onCardModeChange },
  ref
) {
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const savePromiseRef = useRef<Promise<boolean> | null>(null);

  const performSave = useCallback(async (): Promise<boolean> => {
    if (!targetRef.current) {
      setError(t("savePng.cardNotReady"));
      return false;
    }

    setSaving(true);
    setError("");

    // 如果当前是编辑模式，导出前临时切换到预览模式
    const needsMode = cardMode !== "preview";
    const originalMode = cardMode;

    try {
      // 临时切换到预览模式（如果需要）
      if (needsMode && onCardModeChange) {
        onCardModeChange("preview");
        await waitForNextPaint();
      }

      const exportTarget = targetRef.current;
      if (!exportTarget) {
        throw new Error("Card disappeared before export");
      }

      await waitForCardImages(exportTarget);

      const dataUrl = await toPng(exportTarget, {
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
      return true;
    } catch (e) {
      console.error("PNG export failed:", e);
      setError(t("savePng.exportError"));
      return false;
    } finally {
      // 恢复到原来的模式
      if (needsMode && onCardModeChange) {
        onCardModeChange(originalMode);
      }
      setSaving(false);
    }
  }, [targetRef, t, cardMode, onCardModeChange]);

  const handleSave = useCallback((): Promise<boolean> => {
    if (savePromiseRef.current) {
      return savePromiseRef.current;
    }

    const operation = performSave();
    savePromiseRef.current = operation;
    void operation.finally(() => {
      if (savePromiseRef.current === operation) {
        savePromiseRef.current = null;
      }
    });
    return operation;
  }, [performSave]);

  useImperativeHandle(ref, () => ({ save: handleSave }), [handleSave]);

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
});

export default SavePngButton;
