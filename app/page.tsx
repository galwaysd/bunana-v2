"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import ImageUploader from "./components/ImageUploader";
import TextInput from "./components/TextInput";
import FabricDNACard from "./components/FabricDNACard";
import type { CardMode } from "./components/FabricDNACard";
import WeavingLoader from "./components/WeavingLoader";
import SavePngButton, { type SavePngHandle } from "./components/SavePngButton";
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
  const savePngRef = useRef<SavePngHandle>(null);

  const handlePublishedSave = useCallback(async () => {
    return savePngRef.current?.save() ?? false;
  }, []);

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
    <div className="workbench-page" data-phase={phase}>
      <section className="hero-intro" aria-labelledby="home-hero-title">
        <span className="hero-kicker">{t("home.heroKicker")}</span>
        <h2 id="home-hero-title">{t("home.heroTitle")}</h2>
        <p>{t("home.heroSubtitle")}</p>
        <span className="hero-thread" aria-hidden="true" />
      </section>

      <div className="workbench-body">
        <article className="home-step home-step-primary">
          <header className="home-step-heading">
            <span aria-hidden="true" />
            <div>
              <h3>{t("home.editorial.recognition")}</h3>
              <p>{t("home.editorial.recognitionCaption")}</p>
            </div>
          </header>

          {/* ======== Real analysis entry — handlers and state stay unchanged ======== */}
          <aside className="input-panel" data-analysis-label={t("home.analysisInput")}>
          <div className="input-panel-heading">
            <div className="panel-label">{t("home.panelLabel")}</div>
            <span className="panel-step">{t("home.inputMode")}</span>
          </div>

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
        </article>

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
              <div className="card-mode-switch" role="group" aria-label={t("dnaCard.modeLabel")}>
                <button
                  type="button"
                  onClick={() => setCardMode("edit")}
                  className={cardMode === "edit" ? "is-active" : ""}
                  aria-pressed={cardMode === "edit"}
                >
                  {t("dnaCard.editMode")}
                </button>
                <button
                  type="button"
                  onClick={() => setCardMode("preview")}
                  className={cardMode === "preview" ? "is-active" : ""}
                  aria-pressed={cardMode === "preview"}
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
                ref={savePngRef}
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
                onPublishSuccess={handlePublishedSave}
              />
            </>
          )}

        </section>

        {phase === "idle" && (
          <section
            className="pyramid-base"
            aria-label={t("home.pyramid.baseLabel")}
            data-base-label={t("home.pyramid.capabilityBase")}
          >
            <article className="pyramid-panel pyramid-panel-dna">
              <header className="pyramid-panel-heading">
                <span className="pyramid-panel-index" aria-hidden="true" />
                <div>
                  <div className="pyramid-panel-title-row">
                    <h3>{t("home.pyramid.dnaTitle")}</h3>
                    <span>/ {t("home.pyramid.profile")}</span>
                  </div>
                  <p>{t("home.pyramid.dnaCaption")}</p>
                </div>
              </header>
              <div className="pyramid-panel-visual pyramid-dna-archive">
                <div className="pyramid-archive-card pyramid-archive-card-back pyramid-archive-card-back-one">
                  <span>{t("home.pyramid.archiveCode", { index: "07" })}</span>
                  <strong>{t("home.pyramid.archiveRecord")}</strong>
                </div>
                <div className="pyramid-archive-card pyramid-archive-card-back pyramid-archive-card-back-two">
                  <span>{t("home.pyramid.archiveCode", { index: "11" })}</span>
                  <strong>{t("home.pyramid.archiveRecord")}</strong>
                </div>
                <div className="pyramid-archive-card pyramid-archive-card-main">
                  <div className="pyramid-archive-fabric" aria-hidden="true" />
                  <div className="pyramid-archive-data">
                    <span>{t("home.pyramid.myArchive")}</span>
                    <strong>{t("home.editorial.fabricSample")}</strong>
                    <small>{t("home.editorial.fabricComposition")} · {t("home.editorial.fabricWeave")}</small>
                  </div>
                </div>
              </div>
              <div className="pyramid-panel-meta">
                <span>{t("home.pyramid.personalArchive")}</span>
                <span>{t("home.pyramid.visualPreview")}</span>
              </div>
            </article>

            <Link href="/square" className="pyramid-panel pyramid-panel-market">
              <header className="pyramid-panel-heading">
                <span className="pyramid-panel-index" aria-hidden="true" />
                <div>
                  <div className="pyramid-panel-title-row">
                    <h3>{t("home.editorial.market")}</h3>
                    <span>/ {t("home.pyramid.marketLabel")}</span>
                  </div>
                  <p>{t("home.pyramid.marketCaption")}</p>
                </div>
              </header>
              <div className="pyramid-panel-visual pyramid-market-archive">
                <div className="pyramid-market-fabric" aria-hidden="true" />
                <div className="pyramid-market-sheet pyramid-market-sheet-seeking">
                  <span>{t("square.postTypeSeeking")}</span>
                  <strong>{t("home.editorial.marketSeeking")}</strong>
                  <small>{t("home.pyramid.seekingDetail")}</small>
                </div>
                <div className="pyramid-market-sheet pyramid-market-sheet-offering">
                  <span>{t("square.postTypeOffering")}</span>
                  <strong>{t("home.editorial.marketOffering")}</strong>
                  <small>{t("home.pyramid.offeringContact")}</small>
                </div>
              </div>
              <div className="pyramid-panel-meta">
                <span>{t("home.pyramid.marketArchive")}</span>
                <span>{t("home.pyramid.openMarket")}</span>
              </div>
            </Link>

            <article className="pyramid-panel pyramid-panel-chat">
              <header className="pyramid-panel-heading">
                <span className="pyramid-panel-index" aria-hidden="true" />
                <div>
                  <div className="pyramid-panel-title-row">
                    <h3>{t("home.pyramid.chatTitle")}</h3>
                    <span>/ {t("home.pyramid.chatLabel")}</span>
                  </div>
                  <p>{t("home.pyramid.chatCaption")}</p>
                </div>
              </header>
              <div className="pyramid-panel-visual pyramid-chat-archive">
                <div className="pyramid-chat-card pyramid-chat-card-back">
                  <div>
                    <span>{t("home.pyramid.buyer")}</span>
                    <time>09:42</time>
                  </div>
                  <p>{t("home.pyramid.buyerMessage")}</p>
                </div>
                <div className="pyramid-chat-card pyramid-chat-card-main">
                  <div>
                    <span>{t("home.pyramid.supplier")}</span>
                    <time>10:08</time>
                  </div>
                  <p>{t("home.pyramid.supplierMessage")}</p>
                  <small>{t("home.pyramid.conversationPreview")}</small>
                </div>
              </div>
              <div className="pyramid-panel-meta">
                <span>{t("home.pyramid.conversationArchive")}</span>
                <span>{t("home.pyramid.visualPreview")}</span>
              </div>
            </article>
          </section>
        )}
      </div>

      {/* ======== Bottom: Shuttle Track ======== */}
      <div className="shuttle-track">
        <span className="shuttle-track-label">{t("home.aiOrganizing")}</span>
        <div className="shuttle-track-line" />
      </div>

      {phase === "idle" && (
        <footer className="home-footer">
          <span>{t("home.pyramid.feedback")}</span>
          <a href="mailto:aurelian8208@gmail.com">aurelian8208@gmail.com</a>
        </footer>
      )}
    </div>
  );
}
