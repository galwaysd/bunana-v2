"use client";

import { forwardRef, useCallback, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { FabricDNA, FabricField, ImagePayload } from "@/app/types";
import { DNA_FIELD_LABELS } from "@/app/lib/dna";

type Props = {
  dna: FabricDNA;
  aiProvider: string;
  images?: ImagePayload[];
  onDnaChange?: (dna: FabricDNA) => void;
};

/** 规格字段（excl. fabricName + use，它们在身份标识区独立展示） */
const SPEC_FIELDS: (keyof FabricDNA)[] = [
  "composition", "weave", "weightGsm", "width", "coating",
  "waterproof", "moq", "leadTime", "color", "features"
];

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
          aria-label={`编辑${label}`}
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
        aria-label={editable ? `点击编辑${label}` : undefined}
        style={{ textAlign: "left" }}
      >
        {field.value}
      </button>
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
          aria-label={`编辑${label}`}
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
        aria-label={editable ? `点击编辑${label}` : undefined}
        style={{ textAlign: "left" }}
      >
        {field.value}
      </button>
    </div>
  );
}

// ===== FabricDNACard =====

const FabricDNACard = forwardRef<HTMLDivElement, Props>(function FabricDNACard(
  { dna, images = [], onDnaChange },
  ref
) {
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

  return (
    <div ref={ref} className="dna-id-card">
      {images.length > 0 && (
        <div
          className="dna-id-swatch-gallery"
          style={{
            gridTemplateColumns: `repeat(${images.length}, minmax(0, 1fr))`
          }}
        >
          {images.map((image) => (
            <div className="dna-id-swatch" key={image.imageHash}>
              <Image
                src={image.dataUrl}
                alt={image.name || "上传的面料图样"}
                fill
                unoptimized
                sizes="(max-width: 768px) 100vw, 760px"
                style={{ objectFit: "cover" }}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── Header ── */}
      <div className="dna-id-header">
        <div className="dna-id-titles">
          <span className="dna-id-title">FABRIC DNA</span>
          <span className="dna-id-subtitle">织物身份证</span>
        </div>
        <Image
          src="/brand/bunana_logo_lockup.png"
          alt="布拿拿 Bunana"
          width={235}
          height={75}
          style={{
            display: "block",
            width: "auto",
            height: "clamp(18px, 5vw, 24px)",
            maxWidth: "150px",
            flexShrink: 1,
            objectFit: "contain",
            objectPosition: "right center"
          }}
        />
      </div>

      {/* ── Identity Band（面料名称 + 用途）── */}
      <div className="dna-id-band">
        <EditableBandField
          label="面料名称"
          field={dna.fabricName}
          fieldKey="fabricName"
          editable={editable}
          onChange={handleFieldChange}
        />
        <EditableBandField
          label="用途"
          field={dna.use}
          fieldKey="use"
          size="sm"
          editable={editable}
          onChange={handleFieldChange}
        />
      </div>

      {/* ── Spec Fields Grid（10 个规格字段）── */}
      <div className="dna-id-fields">
        {specs.map(([key, field]) => (
          <EditableSpecField
            key={key}
            label={DNA_FIELD_LABELS[key]}
            field={field}
            fieldKey={key}
            editable={editable}
            onChange={handleFieldChange}
          />
        ))}
      </div>
    </div>
  );
});

export default FabricDNACard;
