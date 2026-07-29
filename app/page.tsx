"use client";

import { useState, useCallback, useRef } from "react";
import ImageUploader from "./components/ImageUploader";
import TextInput from "./components/TextInput";
import FabricDNACard from "./components/FabricDNACard";
import WeavingLoader from "./components/WeavingLoader";
import FollowUpQuestions from "./components/FollowUpQuestions";
import SavePngButton from "./components/SavePngButton";
import PublishButton from "./components/PublishButton";
import { useAnalyze } from "./hooks/useAnalyze";
import { useFollowUp } from "./hooks/useFollowUp";
import type { ImagePayload, FabricDNA, FollowUpQuestion } from "./types";

type FlowPhase = "idle" | "analyzing" | "followUp" | "done";

function channelState(phase: FlowPhase): string {
  if (phase === "done") return "channel-line complete";
  if (phase === "analyzing" || phase === "followUp") return "channel-line active";
  return "channel-line";
}

export default function Home() {
  const [images, setImages] = useState<ImagePayload[]>([]);
  const [text, setText] = useState("");

  // ----- Local DNA state (single source of truth) -----
  const [dna, setDna] = useState<FabricDNA | null>(null);
  const [followUpQuestions, setFollowUpQuestions] = useState<FollowUpQuestion[]>([]);
  const [answeredLog, setAnsweredLog] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<FlowPhase>("idle");

  // ----- Card ref (for PNG export) -----
  const cardRef = useRef<HTMLDivElement>(null);

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
    <div className="workbench-page">
      <div className="workbench-body">

        {/* ======== Left: Input Panel ======== */}
        <aside className="input-panel">
          <div className="panel-label">布样工作台</div>

          <ImageUploader
            images={images}
            onImagesChange={setImages}
            disabled={isSubmitDisabled}
          />

          <TextInput
            text={text}
            onTextChange={setText}
            disabled={isSubmitDisabled}
          />

          {/* Analyze button —— idle 状态：图片或文字有其一即可用 */}
          {phase !== "followUp" && phase !== "done" && (
            <button
              onClick={handleInitialAnalyze}
              disabled={!canAnalyze}
              className="btn-weave"
            >
              {phase === "analyzing" ? "织卡中…" : "开始织卡"}
            </button>
          )}
        </aside>

        {/* ======== Center: Weaving Channel ======== */}
        <div className="weaving-channel">
          <div className={channelState(phase)} />
        </div>

        {/* ======== Right: Output Panel ======== */}
        <section className="output-panel">

          {/* Loading (initial analyze) */}
          {initialLoading && <WeavingLoader />}

          {/* Error */}
          {initialError && (
            <div className="error-banner">{initialError}</div>
          )}

          {/* Fabric DNA Card */}
          {dna ? (
            <FabricDNACard
              ref={cardRef}
              dna={dna}
              aiProvider={aiProvider}
              followUpQuestions={followUpQuestions}
            />
          ) : (
            /* DNA 空占位（idle / analyzing 时显示） */
            <div className="dna-placeholder">
              <span className="dna-placeholder-label">
                {phase === "analyzing" ? "AI 正在读取布样数据…" : "FABRIC DNA"}
              </span>
              <div className="dna-placeholder-frame">
                <div className="dna-placeholder-rows">
                  {[
                    "面料名称", "用途", "成分", "织法",
                    "克重", "幅宽", "涂层", "防水性",
                    "起订量", "交期", "颜色", "特性"
                  ].map((label) => (
                    <div className="dna-placeholder-row" key={label}>
                      <div className="ph-label" />
                      <div className="ph-value" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
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
            <>
              <div className="done-status">
                已识别 2 · 已确认 10
              </div>
              <SavePngButton targetRef={cardRef} />
              <PublishButton
                dna={dna}
                text={text}
                images={images}
                aiProvider={aiProvider}
              />
            </>
          )}

          {/* Debug: answeredLog */}
          {phase === "done" && Object.keys(answeredLog).length > 0 && (
            <details className="debug-log">
              <summary>answeredLog</summary>
              <pre>{JSON.stringify(answeredLog, null, 2)}</pre>
            </details>
          )}

        </section>
      </div>
    </div>
  );
}
