"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import ImageUploader from "./components/ImageUploader";
import TextInput from "./components/TextInput";
import FabricDNACard from "./components/FabricDNACard";
import type { CardMode } from "./components/FabricDNACard";
import WeavingLoader from "./components/WeavingLoader";
import SavePngButton from "./components/SavePngButton";
import PublishButton from "./components/PublishButton";
import { useAnalyze } from "./hooks/useAnalyze";
import { useI18n } from "./i18n";
import type { PostType } from "./lib/supabase/requirements";
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
  const { t, tArray } = useI18n();
  const [images, setImages] = useState<ImagePayload[]>([]);
  const [text, setText] = useState("");
  const [postType, setPostType] = useState<PostType | null>(null);
  const [cardMode, setCardMode] = useState<CardMode>("edit");

  /* 从广场详情页「我需要这个面料」跳转来的预填文本 */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prefill = params.get("text");
    const prefillType = params.get("postType");
    if (prefill) {
      setText(decodeURIComponent(prefill));
      window.history.replaceState({}, "", "/");
    }
    if (prefillType === "seeking" || prefillType === "offering") {
      setPostType(prefillType);
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
          <div className="panel-label">{t("home.panelLabel")}</div>

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
              {phase === "analyzing" ? t("home.weavingLoading") : t("home.weavingBtn")}
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
              {t("home.reanalyze")}
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
            <>
              <FabricDNACard
                ref={cardRef}
                dna={dna}
                aiProvider={aiProvider}
                images={images}
                onDnaChange={handleDnaChange}
                cardMode={cardMode}
              />
              {/* Toggle Button: Preview / Edit */}
              <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() => setCardMode("edit")}
                  style={{
                    flex: 1,
                    padding: "0.5rem 1rem",
                    border: cardMode === "edit" ? "2px solid var(--color-brand-500)" : "1px solid var(--color-border)",
                    borderRadius: "6px",
                    background: cardMode === "edit" ? "rgba(139, 115, 85, 0.1)" : "transparent",
                    color: "var(--color-text-primary)",
                    fontSize: "0.9rem",
                    fontWeight: cardMode === "edit" ? 600 : 500,
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  {t("dnaCard.editMode")}
                </button>
                <button
                  onClick={() => setCardMode("preview")}
                  style={{
                    flex: 1,
                    padding: "0.5rem 1rem",
                    border: cardMode === "preview" ? "2px solid var(--color-brand-500)" : "1px solid var(--color-border)",
                    borderRadius: "6px",
                    background: cardMode === "preview" ? "rgba(139, 115, 85, 0.1)" : "transparent",
                    color: "var(--color-text-primary)",
                    fontSize: "0.9rem",
                    fontWeight: cardMode === "preview" ? 600 : 500,
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  {t("dnaCard.previewMode")}
                </button>
              </div>
            </>
          ) : (
            /* DNA 身份证占位（idle / analyzing 时显示） */
            <div className="dna-id-card is-placeholder">
              <div className="dna-id-header">
                <div className="dna-id-titles">
                  <span className="dna-id-title">{t("dnaCard.title")}</span>
                  <span className="dna-id-subtitle">{t("home.dnaSubtitle")}</span>
                </div>
                <span className="dna-id-provider">
                  {phase === "analyzing" ? t("home.readingDna") : t("home.pendingWeave")}
                </span>
              </div>
              <div className="dna-id-band">
                <div className="dna-id-band-row">
                  <span className="dna-id-band-label">{t("dna.fabricName")}</span>
                  <span className="dna-id-band-value">—</span>
                </div>
                <div className="dna-id-band-row">
                  <span className="dna-id-band-label">{t("dna.use")}</span>
                  <span className="dna-id-band-value sm">—</span>
                </div>
              </div>
              <div className="dna-id-summary">
                <span className="dna-id-status-text">
                  {phase === "analyzing"
                    ? t("home.aiReading")
                    : ""}
                </span>
              </div>
              <div className="dna-id-fields">
                {tArray("home.dnaFields").map((label) => (
                  <div className="dna-id-field" key={label}>
                    <span className="dna-id-field-label">{label}</span>
                    <span className="dna-id-field-value">—</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Post Type Selector + Publish - 仅在 DNA 就绪时显示 */}
          {phase === "done" && dna && (
            <>
              {/* PostType 选择器 — 强制二选一，发布按钮依赖 postType */}
              <div className="post-type-selector">
                <div className="post-type-label">{t("home.postType.label")}</div>
                <div className="post-type-options">
                  <button
                    type="button"
                    className={`post-type-option post-type-seeking ${postType === "seeking" ? "is-active" : ""}`}
                    onClick={() => setPostType("seeking")}
                    aria-pressed={postType === "seeking"}
                  >
                    <span className="post-type-title">{t("home.postType.seeking")}</span>
                    <span className="post-type-desc">{t("home.postType.seekingDesc")}</span>
                  </button>
                  <button
                    type="button"
                    className={`post-type-option post-type-offering ${postType === "offering" ? "is-active" : ""}`}
                    onClick={() => setPostType("offering")}
                    aria-pressed={postType === "offering"}
                  >
                    <span className="post-type-title">{t("home.postType.offering")}</span>
                    <span className="post-type-desc">{t("home.postType.offeringDesc")}</span>
                  </button>
                </div>
              </div>

              <SavePngButton 
                targetRef={cardRef} 
                cardMode={cardMode}
                onCardModeChange={setCardMode}
              />
              <PublishButton
                dna={dna}
                text={text}
                images={images}
                aiProvider={aiProvider}
                postType={postType}
              />
            </>
          )}

        </section>
      </div>

      {/* ======== Bottom: Shuttle Track ======== */}
      <div className="shuttle-track">
        <span className="shuttle-track-label">{t("home.aiOrganizing")}</span>
        <div className="shuttle-track-line" />
      </div>
    </div>
  );
}
