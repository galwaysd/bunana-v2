"use client";

import { useState, useCallback } from "react";
import type { FabricDNA, ImagePayload } from "@/app/types";
import { useRouter } from "next/navigation";
import { apiPost } from "@/app/lib/api-client";
import { useI18n } from "@/app/i18n";

type Props = {
  dna: FabricDNA;
  text: string;
  images: ImagePayload[];
  aiProvider: string;
};

export default function PublishButton({ dna, text, images, aiProvider }: Props) {
  const { t } = useI18n();
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handlePublish = useCallback(async () => {
    if (publishing) return;

    setPublishing(true);
    setError("");

    try {
      const data = await apiPost<{ success: boolean; error?: string }>(
        "/api/bunana/requirements",
        { text, dna, images, aiProvider }
      );

      if (!data.success) {
        setError(data.error ?? t("publish.publishError"));
        return;
      }

      // 发布成功 → 跳转广场
      router.push("/square");
    } catch (e) {
      console.error("Publish error:", e);
      setError(t("publish.networkError"));
    } finally {
      setPublishing(false);
    }
  }, [publishing, dna, text, images, aiProvider, router, t]);

  return (
    <div style={{ marginTop: "0.75rem" }}>
      <button
        onClick={handlePublish}
        disabled={publishing}
        style={{
          width: "100%",
          padding: "0.75rem",
          border: "none",
          borderRadius: "8px",
          fontSize: "1rem",
          fontWeight: 600,
          cursor: publishing ? "wait" : "pointer",
          background: publishing ? "#bbdefb" : "#1565c0",
          color: "#fff",
          transition: "background 0.2s",
        }}
      >
        {publishing ? t("publish.publishing") : t("publish.publish")}
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
            fontSize: "0.85rem",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
