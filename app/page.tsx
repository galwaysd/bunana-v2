"use client";

import { useState } from "react";
import ImageUploader from "./components/ImageUploader";
import TextInput from "./components/TextInput";
import FabricDNACard from "./components/FabricDNACard";
import WeavingLoader from "./components/WeavingLoader";
import { useAnalyze } from "./hooks/useAnalyze";
import type { ImagePayload } from "./types";

export default function Home() {
  const [images, setImages] = useState<ImagePayload[]>([]);
  const [text, setText] = useState("");

  const { loading, error, dna, followUpQuestions, aiProvider, analyze } =
    useAnalyze();

  const handleAnalyze = () => {
    analyze(text, images);
  };

  const canAnalyze =
    (text.trim().length > 0 || images.length > 0) && !loading;

  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "1.5rem 1rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: "1.35rem", color: "#333", margin: "0 0 0.25rem" }}>
          Bunana V2
        </h1>
        <p style={{ fontSize: "0.85rem", color: "#999", margin: 0 }}>
          一句话，找到你的布
        </p>
      </div>

      {/* Upload area */}
      <ImageUploader
        images={images}
        onImagesChange={setImages}
        disabled={loading}
      />

      {/* Text input */}
      <TextInput text={text} onTextChange={setText} disabled={loading} />

      {/* Analyze button */}
      <div style={{ marginTop: "0.75rem" }}>
        <button
          onClick={handleAnalyze}
          disabled={!canAnalyze}
          style={{
            width: "100%",
            padding: "0.75rem",
            border: "none",
            borderRadius: "8px",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: canAnalyze ? "pointer" : "not-allowed",
            background: canAnalyze ? "#4a6741" : "#e0e0e0",
            color: canAnalyze ? "#fff" : "#999",
            transition: "background 0.2s"
          }}
        >
          开始织卡
        </button>
      </div>

      {/* Loading */}
      {loading && <WeavingLoader />}

      {/* Error */}
      {error && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.75rem 1rem",
            borderRadius: "8px",
            background: "#fff0f0",
            border: "1px solid #ffcdd2",
            color: "#c62828",
            fontSize: "0.9rem"
          }}
        >
          {error}
        </div>
      )}

      {/* Fabric DNA Card */}
      {dna && (
        <FabricDNACard
          dna={dna}
          aiProvider={aiProvider}
          followUpQuestions={followUpQuestions}
        />
      )}

      {/* Follow-up notice (Phase D) */}
      {dna && followUpQuestions.length > 0 && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.75rem 1rem",
            borderRadius: "8px",
            background: "#fff8e1",
            border: "1px solid #ffcc02",
            color: "#994d00",
            fontSize: "0.85rem"
          }}
        >
          AI 有 {followUpQuestions.length} 个问题需要确认（Phase D 实现追问交互）
        </div>
      )}
    </main>
  );
}
