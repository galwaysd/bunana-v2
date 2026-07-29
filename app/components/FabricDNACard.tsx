"use client";

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

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  identified: { bg: "#e8f5e9", border: "#4caf50", text: "#2e7d32" },
  inferred: { bg: "#fff3e0", border: "#ff9800", text: "#e65100" },
  confirmed: { bg: "#e3f2fd", border: "#2196f3", text: "#0d47a1" },
  missing: { bg: "#fafafa", border: "#e0e0e0", text: "#9e9e9e" }
};

export default function FabricDNACard({
  dna,
  aiProvider,
  followUpQuestions
}: Props) {
  const fields = Object.entries(dna) as [keyof FabricDNA, FabricDNA[keyof FabricDNA]][];

  const identifiedCount = fields.filter(
    ([, f]) => f.status === "identified" || f.status === "inferred"
  ).length;
  const missingCount = fields.filter(([, f]) => f.status === "missing").length;
  const confirmedCount = fields.filter(([, f]) => f.status === "confirmed").length;

  return (
    <div
      style={{
        marginTop: "1.5rem",
        border: "1px solid #e0e0e0",
        borderRadius: "12px",
        background: "#fff",
        overflow: "hidden"
      }}
      className="fabric-dna-card"
    >
      {/* Header */}
      <div
        style={{
          padding: "1rem 1.25rem",
          borderBottom: "1px solid #eee",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#333" }}>
          Fabric DNA
        </h3>
        <span
          style={{
            fontSize: "0.75rem",
            color: "#999",
            background: "#f5f5f5",
            padding: "2px 8px",
            borderRadius: "4px"
          }}
        >
          {aiProvider}
        </span>
      </div>

      {/* Summary bar */}
      <div
        style={{
          padding: "0.5rem 1.25rem",
          display: "flex",
          gap: "1rem",
          fontSize: "0.8rem",
          color: "#666",
          borderBottom: "1px solid #f0f0f0",
          background: "#fafafa"
        }}
      >
        <span style={{ color: "#2e7d32" }}>
          已识别 {identifiedCount}
        </span>
        <span style={{ color: "#666" }}>
          缺失 {missingCount}
        </span>
        <span style={{ color: "#0d47a1" }}>
          已确认 {confirmedCount}
        </span>
        {followUpQuestions && followUpQuestions.length > 0 && (
          <span style={{ color: "#e65100" }}>
            待追问 {followUpQuestions.length}
          </span>
        )}
      </div>

      {/* Fields table */}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "0.875rem"
          }}
        >
          <thead>
            <tr style={{ borderBottom: "1px solid #eee", background: "#fafafa" }}>
              <th
                style={{
                  padding: "0.5rem 1.25rem",
                  textAlign: "left",
                  color: "#999",
                  fontWeight: 500,
                  width: "20%"
                }}
              >
                字段
              </th>
              <th
                style={{
                  padding: "0.5rem 0.5rem",
                  textAlign: "left",
                  color: "#999",
                  fontWeight: 500,
                  width: "40%"
                }}
              >
                值
              </th>
              <th
                style={{
                  padding: "0.5rem 0.5rem",
                  textAlign: "center",
                  color: "#999",
                  fontWeight: 500,
                  width: "20%"
                }}
              >
                状态
              </th>
              <th
                style={{
                  padding: "0.5rem 1.25rem",
                  textAlign: "right",
                  color: "#999",
                  fontWeight: 500,
                  width: "20%"
                }}
              >
                置信度
              </th>
            </tr>
          </thead>
          <tbody>
            {fields.map(([key, field]) => {
              const color = STATUS_COLORS[field.status] ?? STATUS_COLORS.missing;
              return (
                <tr
                  key={key}
                  style={{
                    borderBottom: "1px solid #f5f5f5",
                    background: field.status === "missing" ? "#fafafa" : "transparent"
                  }}
                >
                  <td
                    style={{
                      padding: "0.5rem 1.25rem",
                      color: "#333",
                      fontWeight: 500
                    }}
                  >
                    {DNA_FIELD_LABELS[key]}
                  </td>
                  <td
                    style={{
                      padding: "0.5rem 0.5rem",
                      color: field.value ? "#111" : "#ccc"
                    }}
                  >
                    {field.value || "—"}
                  </td>
                  <td
                    style={{
                      padding: "0.5rem 0.5rem",
                      textAlign: "center"
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        padding: "1px 8px",
                        borderRadius: "10px",
                        fontSize: "0.75rem",
                        background: color.bg,
                        border: `1px solid ${color.border}`,
                        color: color.text
                      }}
                    >
                      {STATUS_LABELS[field.status] ?? field.status}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "0.5rem 1.25rem",
                      textAlign: "right",
                      color: field.confidence > 0 ? "#333" : "#ccc"
                    }}
                  >
                    {field.confidence > 0
                      ? `${Math.round(field.confidence * 100)}%`
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
