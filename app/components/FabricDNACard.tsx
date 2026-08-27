"use client";

import { forwardRef, useCallback, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { FabricDNA, FabricField, ImagePayload } from "@/app/types";
import { useI18n } from "@/app/i18n";
import { DNA_FIELD_KEYS } from "@/app/lib/dna";

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

function FieldStatus({ field }: { field: FabricField }) {
  const { t } = useI18n();
  const isUserInput = field.source === "user_input";
  const label = isUserInput ? t("status.userInput") : t(`status.${field.status}`);

  return (
    <span
      className="dna-field-status"
      data-status={field.status}
      data-source={field.source}
      title={label}
    >
      <span aria-hidden="true" />
      {label}
    </span>
  );
}

// ===== BandFieldDisplay — 面料名称 / 用途（identity band）展示模式 =====

function BandFieldDisplay({
  label,
  field,
  size = "md"
}: {
  label: string;
  field: FabricField;
  size?: "md" | "sm";
}) {
  return (
    <div className="dna-id-band-row dna-id-band-display">
      <span className="dna-id-band-label">{label}</span>
      <span className={`dna-id-band-value ${size === "sm" ? "sm" : ""}`}>
        {field.value || "—"}
      </span>
      <FieldStatus field={field} />
    </div>
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

  const startEdit = useCallback(() => {
    if (!editable || !onChange) return;
    setDraft(field.value);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [editable, field.value, onChange]);

  const commit = useCallback(() => {
    const trimmed = draft.trim();
    if (onChange && trimmed) onChange(fieldKey, trimmed);
    setIsEditing(false);
  }, [draft, fieldKey, onChange]);

  const cancel = useCallback(() => {
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

  const startEdit = useCallback(() => {
    if (!editable || !onChange) return;
    setDraft(field.value);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [editable, field.value, onChange]);

  const commit = useCallback(() => {
    const trimmed = draft.trim();
    if (onChange) onChange(fieldKey, trimmed || field.value);
    setIsEditing(false);
  }, [draft, fieldKey, field.value, onChange]);

  const cancel = useCallback(() => {
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

  const handleFieldChange = useCallback(
    (key: keyof FabricDNA, value: string) => {
      if (!onDnaChange) return;
      onDnaChange({
        ...dna,
        [key]: {
          value,
          status: "confirmed",
          confidence: 1,
          source: "user_input"
        }
      });
    },
    [dna, onDnaChange]
  );

  const editable = Boolean(onDnaChange);
  const isPreview = cardMode === "preview";

  return (
    <div
      ref={ref}
      className={`dna-id-card ${isPreview ? "is-preview-mode" : ""}`}
      data-material-label={t("dnaCard.materialLabel")}
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
          <span className="dna-id-title">{t("dnaCard.title")}</span>
          <span className="dna-id-subtitle">{t("dnaCard.subtitle")}</span>
        </div>
        <Image
          src="/brand/bunana_logo_lockup.png"
          alt={t("dnaCard.logoAlt")}
          width={235}
          height={75}
          className="dna-id-logo"
        />
      </div>

      {/* ── Identity Band（面料名称 + 用途）── */}
      <div className="dna-id-band">
        {isPreview ? (
          <>
            <BandFieldDisplay
              label={dnaLabels.fabricName}
              field={dna.fabricName}
            />
            <BandFieldDisplay
              label={dnaLabels.use}
              field={dna.use}
              size="sm"
            />
          </>
        ) : (
          <>
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
          </>
        )}
      </div>

      {/* ── Spec Fields Grid（10 个规格字段）── */}
      <div className="dna-id-fields">
        {specs.map(([key, field]) => (
          isPreview ? (
            <SpecFieldDisplay
              key={key}
              label={dnaLabels[key]}
              field={field}
            />
          ) : (
            <EditableSpecField
              key={key}
              label={dnaLabels[key]}
              field={field}
              fieldKey={key}
              editable={editable}
              onChange={handleFieldChange}
            />
          )
        ))}
      </div>
    </div>
  );
});

export default FabricDNACard;
