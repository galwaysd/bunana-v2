"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import ImageUploader from "./components/ImageUploader";
import TextInput from "./components/TextInput";
import FabricDNACard from "./components/FabricDNACard";
import WeavingLoader from "./components/WeavingLoader";
import SavePngButton from "./components/SavePngButton";
import PublishButton from "./components/PublishButton";
import { useAnalyze } from "./hooks/useAnalyze";
import type { ImagePayload, FabricDNA } from "./types";
// DNA 存在即可发布 — AI 已填满所有字段

type FlowPhase = "idle" | "analyzing" | "done";

function channelState(phase: FlowPhase): string {
  const base = "weaving-channel";
  if (phase === "done") return `${base} complete`;
  if (phase === "analyzing") return `${base} active`;
  return base;
}

export default function Home() {
  const [images, setImages] = useState<ImagePayload[]>([]);
  const [text, setText] = useState("");

  /* 从广场详情页「我需要这个面料」跳转来的预填文本 */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prefill = params.get("text");
    if (prefill) {
      setText(decodeURIComponent(prefill));
      window.history.replaceState({}, "", "/");
    }
  }, []);

  // ----- DNA state -----
  const [dna, setDna] = useState<FabricDNA | null>(null);
  const [phase, setPhase] = useState<FlowPhase>("idle");

  // ----- Card ref (for PNG export) -----
  const cardRef = useRef<HTMLDivElement>(null);

  // ----- Hook -----
  const {
    loading: initialLoading,
    error: initialError,
    aiProvider,
    analyze
  } = useAnalyze();

  // ----- Initial analyze -----
  const handleInitialAnalyze = useCallback(async () => {
    setPhase("analyzing");
    setDna(null);

    const result = await analyze(text, images);

    if (result) {
      setDna(result.dna);
      setPhase("done");
    } else {
      setPhase("idle");
    }
  }, [text, images, analyze]);

  // ----- Manual edit from the card -----
  const handleDnaChange = useCallback(
    (nextDna: FabricDNA) => {
      setDna(nextDna);
      setPhase("done");
    },
    []
  );

  const canAnalyze =
    (text.trim().length > 0 || images.length > 0) && !initialLoading;

  const isSubmitDisabled = phase === "analyzing";

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

          {/* Analyze button */}
          {phase !== "done" && (
            <button
              type="button"
              onClick={handleInitialAnalyze}
              disabled={!canAnalyze}
              className="btn-weave"
            >
              {phase === "analyzing" ? "织卡中…" : "开始织卡"}
            </button>
          )}

          {/* Re-analyze button when done */}
          {phase === "done" && (
            <button
              type="button"
              onClick={handleInitialAnalyze}
              disabled={!canAnalyze}
              className="btn-weave"
              style={{ opacity: 0.85 }}
            >
              重新分析
            </button>
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
              images={images}
              onDnaChange={handleDnaChange}
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
                    <span className="dna-id-field-value">—</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Done */}
          {phase === "done" && dna && (
            <>
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
        <span className="shuttle-track-label">AI 自动整理中</span>
        <div className="shuttle-track-line" />
      </div>
    </div>
  );
}
