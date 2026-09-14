"use client";

import { forwardRef, useCallback, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { FabricDNA, FabricField, ImagePayload } from "@/app/types";
import { useI18n } from "@/app/i18n";
import { createEmptyField, DNA_FIELD_KEYS } from "@/app/lib/dna";

export type CardMode = "edit" | "preview";

type Props = {
  dna: FabricDNA;
  aiProvider: string;
  images?: ImagePayload[];
  onDnaChange?: (dna: FabricDNA) => void;
  cardMode?: CardMode;
};

/** 规格字段（excl. fabricName + use，它们在身份标识区独立展示） */
const SPEC_FIELDS: (keyof FabricDNA)[] = [
  "composition", "weave", "weightGsm", "width", "coating",
  "waterproof", "moq", "quantity", "destinationMarket", "leadTime",
  "color", "features"
];

/** Preview 的沟通优先级；它只决定展示顺序，不构成新的数据结构。 */
const IDENTITY_FIELDS: (keyof FabricDNA)[] = ["fabricName", "use"];
const MATERIAL_FIELDS: (keyof FabricDNA)[] = [
  "composition", "features", "color", "weave", "waterproof", "coating", "weightGsm", "width"
];
const BUSINESS_FIELDS: (keyof FabricDNA)[] = [
  "quantity", "moq", "leadTime", "destinationMarket"
];
const PREVIEW_FIELDS = [...IDENTITY_FIELDS, ...MATERIAL_FIELDS, ...BUSINESS_FIELDS];

const PREVIEW_FACT_LIMIT = 6;
const PREVIEW_MISSING_LIMIT = 4;

function getTrustState(field: FabricField): "ai" | "text" | "user" | "missing" {
  if (!field.value.trim() || field.status === "missing") return "missing";
  if (field.source === "user_input") return "user";
  if (field.source === "text_extraction") return "text";
  return "ai";
}

function FieldStatus({ field }: { field: FabricField }) {
  const { t } = useI18n();
  const trustState = getTrustState(field);
  const label = t(`status.${trustState}`);

  return (
    <span
      className="dna-field-status"
      data-status={field.status}
      data-source={field.source}
      data-trust={trustState}
      title={label}
    >
      <span aria-hidden="true" />
      {label}
    </span>
  );
}

// ===== SpecFieldDisplay — 规格网格字段展示模式 =====

function SpecFieldDisplay({
  label,
  field
}: {
  label: string;
  field: FabricField;
}) {
  return (
    <div className="dna-id-field dna-id-field-display">
      <span className="dna-id-field-label">{label}</span>
      <span className="dna-id-field-value">{field.value || "—"}</span>
      <FieldStatus field={field} />
    </div>
  );
}

// ===== EditableBandField — 面料名称 / 用途（identity band） =====

function EditableBandField({
  label,
  field,
  fieldKey,
  size = "md",
  editable = false,
  onChange
}: {
  label: string;
  field: FabricField;
  fieldKey: keyof FabricDNA;
  size?: "md" | "sm";
  editable?: boolean;
  onChange?: (key: keyof FabricDNA, value: string) => void;
}) {
  const { t } = useI18n();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(field.value);
  const inputRef = useRef<HTMLInputElement>(null);
  const editFinishedRef = useRef(false);

  const startEdit = useCallback(() => {
    if (!editable || !onChange) return;
    editFinishedRef.current = false;
    setDraft(field.value);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [editable, field.value, onChange]);

  const commit = useCallback(() => {
    if (editFinishedRef.current) return;
    editFinishedRef.current = true;
    const trimmed = draft.trim();
    if (onChange && trimmed !== field.value.trim()) onChange(fieldKey, trimmed);
    setIsEditing(false);
  }, [draft, field.value, fieldKey, onChange]);

  const cancel = useCallback(() => {
    editFinishedRef.current = true;
    setDraft(field.value);
    setIsEditing(false);
  }, [field.value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") { e.preventDefault(); commit(); }
      else if (e.key === "Escape") { e.preventDefault(); cancel(); }
    },
    [commit, cancel]
  );

  if (isEditing) {
    return (
      <div className="dna-id-band-row is-editing">
        <span className="dna-id-band-label">{label}</span>
        <input
          ref={inputRef}
          type="text"
          className={`dna-id-band-input ${size === "sm" ? "sm" : ""}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          aria-label={t("dnaCard.editLabel", { label })}
        />
      </div>
    );
  }

  return (
    <div className={`dna-id-band-row${editable ? " is-editable" : ""}`}>
      <span className="dna-id-band-label">{label}</span>
      <button
        type="button"
        className={`dna-id-band-value ${size === "sm" ? "sm" : ""}`}
        onClick={startEdit}
        disabled={!editable}
        aria-label={editable ? t("dnaCard.clickToEdit", { label }) : undefined}
        style={{ textAlign: "left" }}
      >
        {field.value || "—"}
      </button>
      <FieldStatus field={field} />
    </div>
  );
}

// ===== EditableSpecField — 规格网格字段 =====

function EditableSpecField({
  label,
  field,
  fieldKey,
  editable = false,
  onChange
}: {
  label: string;
  field: FabricField;
  fieldKey: keyof FabricDNA;
  editable?: boolean;
  onChange?: (key: keyof FabricDNA, value: string) => void;
}) {
  const { t } = useI18n();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(field.value);
  const inputRef = useRef<HTMLInputElement>(null);
  const editFinishedRef = useRef(false);

  const startEdit = useCallback(() => {
    if (!editable || !onChange) return;
    editFinishedRef.current = false;
    setDraft(field.value);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [editable, field.value, onChange]);

  const commit = useCallback(() => {
    if (editFinishedRef.current) return;
    editFinishedRef.current = true;
    const trimmed = draft.trim();
    if (onChange && trimmed !== field.value.trim()) onChange(fieldKey, trimmed);
    setIsEditing(false);
  }, [draft, fieldKey, field.value, onChange]);

  const cancel = useCallback(() => {
    editFinishedRef.current = true;
    setDraft(field.value);
    setIsEditing(false);
  }, [field.value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") { e.preventDefault(); commit(); }
      else if (e.key === "Escape") { e.preventDefault(); cancel(); }
    },
    [commit, cancel]
  );

  if (isEditing) {
    return (
      <div className="dna-id-field is-editing">
        <span className="dna-id-field-label">{label}</span>
        <input
          ref={inputRef}
          type="text"
          className="dna-id-field-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          aria-label={t("dnaCard.editLabel", { label })}
        />
      </div>
    );
  }

  return (
    <div className={`dna-id-field${editable ? " is-editable" : ""}`}>
      <span className="dna-id-field-label">{label}</span>
      <button
        type="button"
        className="dna-id-field-value"
        onClick={startEdit}
        disabled={!editable}
        aria-label={editable ? t("dnaCard.clickToEdit", { label }) : undefined}
        style={{ textAlign: "left" }}
      >
        {field.value || "—"}
      </button>
      <FieldStatus field={field} />
    </div>
  );
}

// ===== FabricDNACard =====

const FabricDNACard = forwardRef<HTMLDivElement, Props>(function FabricDNACard(
  { dna, images = [], onDnaChange, cardMode = "edit" },
  ref
) {
  const { t } = useI18n();

  // Build label map from i18n
  const dnaLabels = useMemo(() => {
    const map: Record<string, string> = {};
    for (const key of DNA_FIELD_KEYS) {
      map[key] = t(`dna.${key}`);
    }
    return map;
  }, [t]);

  const specs = useMemo(
    () => SPEC_FIELDS.map((key) => [key, dna[key]] as const),
    [dna]
  );

  const previewFacts = useMemo(() => {
    const available = (keys: (keyof FabricDNA)[]) =>
      keys.filter((key) => getTrustState(dna[key]) !== "missing");
    const selected = [
      ...available(IDENTITY_FIELDS).slice(0, 2),
      ...available(MATERIAL_FIELDS).slice(0, 2),
      ...available(BUSINESS_FIELDS).slice(0, 2)
    ];
    const remaining = PREVIEW_FIELDS.filter(
      (key) => getTrustState(dna[key]) !== "missing" && !selected.includes(key)
    );

    return [...selected, ...remaining]
      .slice(0, PREVIEW_FACT_LIMIT)
      .map((key) => [key, dna[key]] as const);
  }, [dna]);

  const previewMissing = useMemo(
    () => PREVIEW_FIELDS
      .filter((key) => getTrustState(dna[key]) === "missing")
      .slice(0, PREVIEW_MISSING_LIMIT),
    [dna]
  );

  const previewSummary = useMemo(() => {
    const sentences: string[] = [];
    if (getTrustState(dna.fabricName) !== "missing") {
      sentences.push(t("dnaCard.summaryFabric", { value: dna.fabricName.value }));
    }
    if (getTrustState(dna.use) !== "missing") {
      sentences.push(t("dnaCard.summaryUse", { value: dna.use.value }));
    }

    const supportingFacts = previewFacts
      .filter(([key]) => key !== "fabricName" && key !== "use")
      .slice(0, 3);
    const trustGroups = (["text", "user", "ai"] as const).map((trust) => ({
      trust,
      details: supportingFacts
        .filter(([, field]) => getTrustState(field) === trust)
        .map(([key, field]) =>
          t("dnaCard.summaryField", { label: dnaLabels[key], value: field.value })
        )
    }));
    for (const group of trustGroups) {
      if (group.details.length === 0) continue;
      const key = group.trust === "text"
        ? "dnaCard.summaryTextKnown"
        : group.trust === "user"
          ? "dnaCard.summaryUserKnown"
          : "dnaCard.summaryAiKnown";
      sentences.push(t(key, { details: group.details.join(t("dnaCard.summaryJoin")) }));
    }

    return sentences.length > 0
      ? sentences.join(t("dnaCard.summarySentenceJoin"))
      : t("dnaCard.summaryInsufficient");
  }, [dna, dnaLabels, previewFacts, t]);

  const handleFieldChange = useCallback(
    (key: keyof FabricDNA, value: string) => {
      if (!onDnaChange) return;
      const normalizedValue = value.trim();
      onDnaChange({
        ...dna,
        [key]: normalizedValue
          ? {
              value: normalizedValue,
              status: "confirmed",
              confidence: 1,
              source: "user_input"
            }
          : createEmptyField()
      });
    },
    [dna, onDnaChange]
  );

  const editable = Boolean(onDnaChange);
  const isPreview = cardMode === "preview";

  return (
    <div
      ref={ref}
      className={`dna-id-card ${isPreview ? "is-preview-mode" : ""}${images.length > 0 ? " has-swatch" : ""}`}
      data-material-label={t("dnaCard.materialLabel")}
      data-export-kind="procurement-summary"
    >
      {images.length > 0 && (
        <div
          className="dna-id-swatch-gallery"
          style={{
            gridTemplateColumns: `repeat(${images.length}, minmax(0, 1fr))`
          }}
        >
          {images.map((image) => (
            <div className="dna-id-swatch" key={image.imageHash}>
              {/* 本地 data URL 使用原生 img，确保 html-to-image 能稳定克隆像素。 */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.dataUrl}
                alt={image.name || t("dnaCard.imageAlt")}
                loading="eager"
                decoding="sync"
                draggable={false}
                style={{
                  display: "block",
                  width: "100%",
                  height: "100%",
                  objectFit: "cover"
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── Header ── */}
      <div className="dna-id-header">
        <div className="dna-id-titles">
          <span className="dna-id-title">
            {isPreview ? t("dnaCard.summaryTitle") : t("dnaCard.title")}
          </span>
          <span className="dna-id-subtitle">
            {isPreview ? t("dnaCard.summarySubtitle") : t("dnaCard.subtitle")}
          </span>
        </div>
        <Image
          src="/brand/bunana_logo_lockup.png"
          alt={t("dnaCard.logoAlt")}
          width={235}
          height={75}
          className="dna-id-logo"
        />
      </div>

      {isPreview ? (
        <>
          <section className="dna-id-context dna-id-natural-summary">
            <div className="dna-id-context-block">
              <span className="dna-id-context-label">{t("dnaCard.naturalSummaryLabel")}</span>
              <p>{previewSummary}</p>
            </div>
          </section>

          <div className="dna-id-section-label">{t("dnaCard.knownFieldsLabel")}</div>
          <div className="dna-id-fields dna-id-preview-facts">
            {previewFacts.map(([key, field]) => (
              <SpecFieldDisplay key={key} label={dnaLabels[key]} field={field} />
            ))}
          </div>

          {previewFacts.length === 0 ? (
            <p className="dna-id-missing-summary is-all-missing">
              {t("dnaCard.summaryEmpty")}
            </p>
          ) : previewMissing.length > 0 ? (
            <p className="dna-id-missing-summary">
              {t("dnaCard.summaryMissing", {
                fields: previewMissing.map((key) => dnaLabels[key]).join(t("dnaCard.summaryJoin"))
              })}
            </p>
          ) : null}
        </>
      ) : (
        <>
          {/* ── Identity Band（面料名称 + 用途）── */}
          <div className="dna-id-band">
            <EditableBandField
              label={dnaLabels.fabricName}
              field={dna.fabricName}
              fieldKey="fabricName"
              editable={editable}
              onChange={handleFieldChange}
            />
            <EditableBandField
              label={dnaLabels.use}
              field={dna.use}
              fieldKey="use"
              size="sm"
              editable={editable}
              onChange={handleFieldChange}
            />
          </div>

          {/* ── Spec Fields Grid（12 个规格字段）── */}
          <div className="dna-id-fields">
            {specs.map(([key, field]) => (
            <EditableSpecField
              key={key}
              label={dnaLabels[key]}
              field={field}
              fieldKey={key}
              editable={editable}
              onChange={handleFieldChange}
            />
            ))}
          </div>
        </>
      )}
    </div>
  );
});

export default FabricDNACard;
