"use client";

import { useState, useCallback } from "react";
import type { FabricDNA, ImagePayload } from "@/app/types";
import { useRouter } from "next/navigation";

type Props = {
  dna: FabricDNA;
  text: string;
  images: ImagePayload[];
  aiProvider: string;
};

export default function PublishButton({ dna, text, images, aiProvider }: Props) {
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handlePublish = useCallback(async () => {
    if (publishing) return;

    setPublishing(true);
    setError("");

    try {
      const resp = await fetch("/api/bunana/requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, dna, images, aiProvider }),
      });

      const data = await resp.json();

      if (!data.success) {
        setError(data.error ?? "发布失败，请重试。");
        return;
      }

      // 发布成功 → 跳转广场
      router.push("/square");
    } catch (e) {
      console.error("Publish error:", e);
      setError("网络错误，发布失败。");
    } finally {
      setPublishing(false);
    }
  }, [publishing, dna, text, images, aiProvider, router]);

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
        {publishing ? "发布中..." : "发布广场"}
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
