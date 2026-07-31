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

type AnswerHistoryItem = {
  dnaBefore: FabricDNA;
  questionsBefore: FollowUpQuestion[];
  answeredLogBefore: Record<string, string>;
  answer: string;
};

function channelState(phase: FlowPhase): string {
  const base = "weaving-channel";
  if (phase === "done") return `${base} complete`;
  if (phase === "analyzing" || phase === "followUp") return `${base} active`;
  return base;
}

export default function Home() {
  const [images, setImages] = useState<ImagePayload[]>([]);
  const [text, setText] = useState("");

  // ----- Local DNA state (single source of truth) -----
  const [dna, setDna] = useState<FabricDNA | null>(null);
  const [followUpQuestions, setFollowUpQuestions] = useState<FollowUpQuestion[]>([]);
  const [answeredLog, setAnsweredLog] = useState<Record<string, string>>({});
  const [answerHistory, setAnswerHistory] = useState<AnswerHistoryItem[]>([]);
  const [answerToEdit, setAnswerToEdit] = useState("");
  const [phase, setPhase] = useState<FlowPhase>("idle");

  // ----- Card ref (for PNG export) -----
  const cardRef = useRef<HTMLDivElement>(null);
  const refineActionInFlight = useRef(false);

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
    setAnswerHistory([]);
    setAnswerToEdit("");

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
      if (!dna || followUpQuestions.length === 0 || refineActionInFlight.current) return;
      refineActionInFlight.current = true;

      const question = followUpQuestions[0];
      const historyItem: AnswerHistoryItem = {
        dnaBefore: dna,
        questionsBefore: followUpQuestions,
        answeredLogBefore: answeredLog,
        answer
      };
      clearFollowUpError();

      try {
        const result = await refine(dna, question, answer, answeredLog);

        if (!result) return; // error: DNA + question preserved

        setDna(result.dna);
        setAnsweredLog(result.answeredLog);
        setFollowUpQuestions(result.followUpQuestions);
        setAnswerHistory((history) => [...history, historyItem]);
        setAnswerToEdit("");

        if (result.followUpQuestions.length === 0) {
          setPhase("done");
        }
      } finally {
        refineActionInFlight.current = false;
      }
    },
    [dna, followUpQuestions, answeredLog, refine, clearFollowUpError]
  );

  const handleBackQuestion = useCallback(() => {
    const previous = answerHistory[answerHistory.length - 1];
    if (!previous || refineSubmitting) return;

    clearFollowUpError();
    setDna(previous.dnaBefore);
    setFollowUpQuestions(previous.questionsBefore);
    setAnsweredLog(previous.answeredLogBefore);
    setAnswerHistory((history) => history.slice(0, -1));
    setAnswerToEdit(previous.answer);
    setPhase("followUp");
  }, [answerHistory, refineSubmitting, clearFollowUpError]);

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
              type="button"
              onClick={handleInitialAnalyze}
              disabled={!canAnalyze}
              className="btn-weave"
            >
              {phase === "analyzing" ? "织卡中…" : "开始织卡"}
            </button>
          )}

          {/* Follow-up questions stay with the input workbench. */}
          {phase === "followUp" && dna && followUpQuestions.length > 0 && (
            <FollowUpQuestions
              key={followUpQuestions[0].id}
              question={followUpQuestions[0]}
              questionIndex={answerHistory.length}
              totalCount={answerHistory.length + followUpQuestions.length}
              submitting={refineSubmitting}
              error={refineError}
              initialAnswer={answerToEdit}
              canGoBack={answerHistory.length > 0}
              onBack={handleBackQuestion}
              onSubmit={handleRefineAnswer}
            />
          )}

          {phase === "done" && answerHistory.length > 0 && (
            <div className="followup-complete-actions">
              <span>问答已完成</span>
              <button
                type="button"
                className="followup-back-button"
                onClick={handleBackQuestion}
              >
                ← 返回上一题
              </button>
            </div>
          )}
        </aside>

        {/* ======== Center: Weaving Channel ======== */}
        <div className={channelState(phase)}>
          <span className="channel-edge-left" />
          <span className="channel-edge-right" />
          <div className="channel-spine">
            <span className="channel-node" />
            <span className="channel-node" />
            <span className="channel-node" />
            <span className="channel-node" />
            <span className="channel-node" />
          </div>
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
            /* DNA 身份证占位（idle / analyzing 时显示） */
            <div className="dna-id-card is-placeholder">
              <div className="dna-id-header">
                <div className="dna-id-titles">
                  <span className="dna-id-title">FABRIC DNA</span>
                  <span className="dna-id-subtitle">织物身份证</span>
                </div>
                <span className="dna-id-provider">
                  {phase === "analyzing" ? "读取中…" : "待织入"}
                </span>
              </div>
              <div className="dna-id-band">
                <div className="dna-id-band-row">
                  <span className="dna-id-band-label">面料名称</span>
                  <span className="dna-id-band-value">—</span>
                </div>
                <div className="dna-id-band-row">
                  <span className="dna-id-band-label">用途</span>
                  <span className="dna-id-band-value sm">—</span>
                </div>
              </div>
              <div className="dna-id-summary">
                <span className="dna-id-status-text">
                  {phase === "analyzing"
                    ? "AI 正在读取布样数据…"
                    : "上传布样或描述需求后开始织卡"}
                </span>
              </div>
              <div className="dna-id-fields">
                {[
                  "成分", "织法", "克重", "幅宽", "涂层",
                  "防水", "起订量", "交期", "颜色", "特性"
                ].map((label) => (
                  <div className="dna-id-field" key={label}>
                    <span className="dna-id-field-label">{label}</span>
                    <span className="dna-id-field-value is-empty">—</span>
                    <span className="field-dot dot-missing" />
                  </div>
                ))}
              </div>
            </div>
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

        </section>
      </div>

      {/* ======== Bottom: Shuttle Track ======== */}
      <div className="shuttle-track">
        <span className="shuttle-track-label">梭子追问轨道</span>
        <div className="shuttle-track-line" />
      </div>
    </div>
  );
}
