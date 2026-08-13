"use client";

import { useState, useCallback } from "react";
import type { FabricDNA, ImagePayload } from "@/app/types";
import type { PostType } from "@/app/lib/supabase/requirements";
import { useRouter } from "next/navigation";
import { apiPost } from "@/app/lib/api-client";
import { useI18n } from "@/app/i18n";

type Props = {
  dna: FabricDNA;
  text: string;
  images: ImagePayload[];
  aiProvider: string;
  postType: PostType | null;
};

export default function PublishButton({ dna, text, images, aiProvider, postType }: Props) {
  const { t } = useI18n();
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handlePublish = useCallback(async () => {
    if (publishing) return;
    if (!postType) {
      setError(t("home.postType.required"));
      return;
    }

    setPublishing(true);
    setError("");

    try {
      const data = await apiPost<{ success: boolean; error?: string }>(
        "/api/bunana/requirements",
        { text, dna, images, aiProvider, postType }
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
  }, [publishing, dna, text, images, aiProvider, postType, router, t]);

  const disabled = publishing || !postType;

  return (
    <div style={{ marginTop: "0.75rem" }}>
      <button
        onClick={handlePublish}
        disabled={disabled}
        style={{
          width: "100%",
          padding: "0.75rem",
          border: "none",
          borderRadius: "8px",
          fontSize: "1rem",
          fontWeight: 600,
          cursor: disabled ? "not-allowed" : "pointer",
          background: disabled ? "#cfd8dc" : "#1565c0",
          color: "#fff",
          transition: "background 0.2s",
          opacity: disabled ? 0.6 : 1,
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
