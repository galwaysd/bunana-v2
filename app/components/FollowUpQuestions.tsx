"use client";

import { useState } from "react";
import type { FollowUpQuestion } from "@/app/types";
import { DNA_FIELD_LABELS } from "@/app/lib/dna";

type Props = {
  question: FollowUpQuestion;
  questionIndex: number;
  totalCount: number;
  submitting: boolean;
  error: string;
  initialAnswer?: string;
  canGoBack: boolean;
  onBack: () => void;
  onSubmit: (answer: string) => void;
};

export default function FollowUpQuestions({
  question,
  questionIndex,
  totalCount,
  submitting,
  error,
  initialAnswer = "",
  canGoBack,
  onBack,
  onSubmit
}: Props) {
  const [answer, setAnswer] = useState(initialAnswer);

  const handleSubmit = () => {
    const trimmed = answer.trim();
    if (!trimmed || submitting) return;
    onSubmit(trimmed);
    setAnswer("");
  };

  return (
    <div
      className="followup-card"
      style={{
        marginTop: "1.25rem",
        border: "1px solid #e0e0e0",
        borderRadius: "12px",
        background: "#fff",
        overflow: "hidden"
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "0.75rem 1.25rem",
          borderBottom: "1px solid #eee",
          background: "#f9fafb",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <span style={{ fontSize: "0.85rem", color: "#666", fontWeight: 500 }}>
          追问 {questionIndex + 1} / {totalCount}
        </span>
        <div className="followup-header-actions">
          {canGoBack && (
            <button
              type="button"
              className="followup-back-button"
              disabled={submitting}
              onClick={onBack}
            >
              ← 返回上一题
            </button>
          )}
          <span
            style={{
              fontSize: "0.75rem",
              color: "#999",
              background: "#f0f0f0",
              padding: "2px 8px",
              borderRadius: "4px"
            }}
          >
            {DNA_FIELD_LABELS[question.field] || question.field}
          </span>
        </div>
      </div>

      {/* Question */}
      <div style={{ padding: "1rem 1.25rem" }}>
        <p
          style={{
            margin: "0 0 0.75rem",
            fontSize: "0.95rem",
            color: "#333",
            lineHeight: 1.5
          }}
        >
          {question.question}
        </p>

        {/* Options */}
        {question.options.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.5rem",
              marginBottom: "0.75rem"
            }}
          >
            {question.options.map((opt) => (
              <button
                key={opt}
                type="button"
                disabled={submitting}
                onClick={() => setAnswer(opt)}
                style={{
                  padding: "0.4rem 0.85rem",
                  border:
                    answer === opt ? "2px solid #4a6741" : "1px solid #ddd",
                  borderRadius: "20px",
                  fontSize: "0.85rem",
                  background: answer === opt ? "#e8f5e9" : "#fff",
                  color: answer === opt ? "#2e7d32" : "#555",
                  cursor: submitting ? "not-allowed" : "pointer",
                  transition: "all 0.15s"
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {/* Free text input */}
        <div className="followup-answer-row">
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && answer.trim() && !submitting) {
                handleSubmit();
              }
            }}
            placeholder="输入你的回答..."
            disabled={submitting}
            className="followup-answer-input"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!answer.trim() || submitting}
            className="followup-submit-button"
          >
            {submitting ? "正在织入…" : "确认回答"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            margin: "0 1.25rem 0.75rem",
            padding: "0.5rem 0.75rem",
            borderRadius: "6px",
            background: "#fff0f0",
            border: "1px solid #ffcdd2",
            color: "#c62828",
            fontSize: "0.8rem"
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
