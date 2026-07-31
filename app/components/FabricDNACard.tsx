"use client";

import { forwardRef } from "react";
import Image from "next/image";
import type { FabricDNA, FollowUpQuestion, ImagePayload } from "@/app/types";
import { DNA_FIELD_LABELS } from "@/app/lib/dna";

type Props = {
  dna: FabricDNA;
  aiProvider: string;
  images?: ImagePayload[];
  followUpQuestions?: FollowUpQuestion[];
};

const STATUS_LABELS: Record<string, string> = {
  identified: "已识别",
  inferred: "推测",
  confirmed: "已确认",
  missing: "缺失"
};

/** PNG 导出展示的 12 个字段（不含 quantity / destinationMarket） */
/** 规格字段（excl. fabricName + use，它们进入身份标识区） */
const SPEC_FIELDS: (keyof FabricDNA)[] = [
  "composition", "weave", "weightGsm", "width", "coating",
  "waterproof", "moq", "leadTime", "color", "features"
];

const FabricDNACard = forwardRef<HTMLDivElement, Props>(function FabricDNACard(
  { dna, images = [] },
  ref
) {
  const nameField = dna.fabricName;
  const useField = dna.use;
  const specs = SPEC_FIELDS.map((key) => [key, dna[key]] as const);


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

      {/* ── Identity Band ── */}
      <div className="dna-id-band">
        <div className="dna-id-band-row">
          <span className="dna-id-band-label">面料名称</span>
          <span className="dna-id-band-value">
            {nameField.value || "—"}
          </span>
          <span className={`dna-id-stamp s-${nameField.status}`}>
            {STATUS_LABELS[nameField.status] ?? nameField.status}
          </span>
        </div>
        <div className="dna-id-band-row">
          <span className="dna-id-band-label">用途</span>
          <span className="dna-id-band-value sm">
            {useField.value || "—"}
          </span>
          <span className={`dna-id-stamp s-${useField.status}`}>
            {STATUS_LABELS[useField.status] ?? useField.status}
          </span>
        </div>
      </div>

      {/* ── Spec Fields Grid ── */}
      <div className="dna-id-fields">
        {specs.map(([key, field]) => (
          <div className="dna-id-field" key={key}>
            <span className="dna-id-field-label">
              {DNA_FIELD_LABELS[key]}
            </span>
            <span className={`dna-id-field-value${field.value ? "" : " is-empty"}`}>
              {field.value || "—"}
            </span>
            <span
              className={`field-dot dot-${field.status}`}
              title={STATUS_LABELS[field.status] ?? field.status}
            />
          </div>
        ))}
      </div>
    </div>
  );
});

export default FabricDNACard;
