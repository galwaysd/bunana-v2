"use client";

import { useState, useCallback } from "react";
import ImageUploader from "./components/ImageUploader";
import TextInput from "./components/TextInput";
import FabricDNACard from "./components/FabricDNACard";
import WeavingLoader from "./components/WeavingLoader";
import FollowUpQuestions from "./components/FollowUpQuestions";
import { useAnalyze } from "./hooks/useAnalyze";
import { useFollowUp } from "./hooks/useFollowUp";
import type { ImagePayload, FabricDNA, FollowUpQuestion } from "./types";

type FlowPhase = "idle" | "analyzing" | "followUp" | "done";

export default function Home() {
  const [images, setImages] = useState<ImagePayload[]>([]);
  const [text, setText] = useState("");

  // ----- Local DNA state (single source of truth) -----
  const [dna, setDna] = useState<FabricDNA | null>(null);
  const [followUpQuestions, setFollowUpQuestions] = useState<FollowUpQuestion[]>([]);
  const [answeredLog, setAnsweredLog] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<FlowPhase>("idle");

  // ----- Hooks -----
  const {
    loading: initialLoading,
    error: initialError,
    aiProvider,
    analyze
  } = useAnalyze();

  const {
    submitting: refineSubmitting,
    error: refineError,
    refine,
    clearError: clearFollowUpError
  } = useFollowUp();

  // ----- Initial analyze -----
  const handleInitialAnalyze = useCallback(async () => {
    setPhase("analyzing");
    setDna(null);
    setFollowUpQuestions([]);
    setAnsweredLog({});

    const result = await analyze(text, images);

    if (result) {
      setDna(result.dna);
      setFollowUpQuestions(result.followUpQuestions);
      setPhase(result.followUpQuestions.length > 0 ? "followUp" : "done");
    } else {
      setPhase("idle");
    }
  }, [text, images, analyze]);

  // ----- Refine (answer follow-up) -----
  const handleRefineAnswer = useCallback(
    async (answer: string) => {
      if (!dna || followUpQuestions.length === 0) return;

      const question = followUpQuestions[0];
      clearFollowUpError();

      const result = await refine(dna, question, answer, answeredLog);

      if (!result) return; // error: DNA + question + answer preserved

      setDna(result.dna);
      setAnsweredLog(result.answeredLog);
      setFollowUpQuestions(result.followUpQuestions);

      if (result.followUpQuestions.length === 0) {
        setPhase("done");
      }
    },
    [dna, followUpQuestions, answeredLog, refine, clearFollowUpError]
  );

  const canAnalyze =
    (text.trim().length > 0 || images.length > 0) && !initialLoading;

  const isSubmitDisabled = phase === "analyzing" || phase === "followUp";

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
        disabled={isSubmitDisabled}
      />

      {/* Text input */}
      <TextInput text={text} onTextChange={setText} disabled={isSubmitDisabled} />

      {/* Analyze button */}
      {phase !== "followUp" && phase !== "done" && (
        <div style={{ marginTop: "0.75rem" }}>
          <button
            onClick={handleInitialAnalyze}
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
      )}

      {/* Loading (initial analyze) */}
      {initialLoading && <WeavingLoader />}

      {/* Error */}
      {(initialError || (phase === "idle" && !initialLoading ? "" : "")) && (
        initialError ? (
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
            {initialError}
          </div>
        ) : null
      )}

      {/* Fabric DNA Card */}
      {dna && (
        <FabricDNACard
          dna={dna}
          aiProvider={aiProvider}
          followUpQuestions={followUpQuestions}
        />
      )}

      {/* Follow-up question flow */}
      {phase === "followUp" && dna && followUpQuestions.length > 0 && (
        <FollowUpQuestions
          question={followUpQuestions[0]}
          questionIndex={Object.keys(answeredLog).length}
          totalCount={
            followUpQuestions.length + Object.keys(answeredLog).length
          }
          submitting={refineSubmitting}
          error={refineError}
          onSubmit={handleRefineAnswer}
        />
      )}

      {/* Done */}
      {phase === "done" && dna && (
        <div
          style={{
            marginTop: "1.25rem",
            padding: "1rem 1.25rem",
            borderRadius: "12px",
            background: "#e8f5e9",
            border: "1px solid #a5d6a7",
            color: "#2e7d32",
            fontSize: "0.9rem",
            textAlign: "center"
          }}
        >
          所有问题已回答完毕。Fabric DNA 已构建完成。
        </div>
      )}

      {/* Debug: answeredLog */}
      {phase === "done" && Object.keys(answeredLog).length > 0 && (
        <details
          style={{
            marginTop: "0.75rem",
            fontSize: "0.8rem",
            color: "#999",
            cursor: "pointer"
          }}
        >
          <summary style={{ marginBottom: "0.25rem" }}>answeredLog</summary>
          <pre
            style={{
              margin: 0,
              padding: "0.5rem",
              background: "#f5f5f5",
              borderRadius: "6px",
              overflow: "auto",
              maxHeight: 200
            }}
          >
            {JSON.stringify(answeredLog, null, 2)}
          </pre>
        </details>
      )}
    </main>
  );
}
