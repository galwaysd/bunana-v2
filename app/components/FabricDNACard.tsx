"use client";

import { forwardRef } from "react";
import type { FabricDNA, FollowUpQuestion } from "@/app/types";
import { DNA_FIELD_LABELS } from "@/app/lib/dna";

type Props = {
  dna: FabricDNA;
  aiProvider: string;
  followUpQuestions?: FollowUpQuestion[];
};

const STATUS_LABELS: Record<string, string> = {
  identified: "已识别",
  inferred: "推测",
  confirmed: "已确认",
  missing: "缺失"
};

/** PNG 导出展示的 12 个字段（不含 quantity / destinationMarket） */
const DISPLAY_FIELDS: (keyof FabricDNA)[] = [
  "fabricName",
  "use",
  "composition",
  "weave",
  "weightGsm",
  "width",
  "coating",
  "waterproof",
  "moq",
  "leadTime",
  "color",
  "features"
];

/** 规格字段（excl. fabricName + use，它们进入身份标识区） */
const SPEC_FIELDS: (keyof FabricDNA)[] = [
  "composition", "weave", "weightGsm", "width", "coating",
  "waterproof", "moq", "leadTime", "color", "features"
];

const FabricDNACard = forwardRef<HTMLDivElement, Props>(function FabricDNACard(
  { dna, aiProvider, followUpQuestions },
  ref
) {
  const nameField = dna.fabricName;
  const useField = dna.use;
  const specs = SPEC_FIELDS.map((key) => [key, dna[key]] as const);

  const identifiedCount = DISPLAY_FIELDS.filter(
    (key) => dna[key].status === "identified"
  ).length;
  const inferredCount = DISPLAY_FIELDS.filter(
    (key) => dna[key].status === "inferred"
  ).length;
  const missingCount = DISPLAY_FIELDS.filter(
    (key) => dna[key].status === "missing"
  ).length;
  const confirmedCount = DISPLAY_FIELDS.filter(
    (key) => dna[key].status === "confirmed"
  ).length;

  return (
    <div ref={ref} className="dna-id-card">
      {/* ── Header ── */}
      <div className="dna-id-header">
        <div className="dna-id-titles">
          <span className="dna-id-title">FABRIC DNA</span>
          <span className="dna-id-subtitle">织物身份证</span>
        </div>
        <span className="dna-id-provider">{aiProvider}</span>
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

      {/* ── Summary ── */}
      <div className="dna-id-summary">
        <span className="sum-item">
          <i className="sum-dot dot-confirmed" />
          已确认 {confirmedCount}
        </span>
        <span className="sum-item">
          <i className="sum-dot dot-identified" />
          已识别 {identifiedCount}
        </span>
        <span className="sum-item">
          <i className="sum-dot dot-inferred" />
          推测 {inferredCount}
        </span>
        <span className="sum-item">
          <i className="sum-dot dot-missing" />
          缺失 {missingCount}
        </span>
        {followUpQuestions && followUpQuestions.length > 0 && (
          <span className="sum-item">
            <i className="sum-dot dot-pending" />
            待追问 {followUpQuestions.length}
          </span>
        )}
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
