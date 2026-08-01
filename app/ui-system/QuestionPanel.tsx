"use client";

import "./QuestionPanel.css";

export type QuestionPanelVariant = "choice" | "text" | "completed";
export type QuestionPanelDensity = "comfortable" | "compact";

export interface QuestionPanelOption {
  label: string;
  value: string;
}

export interface QuestionPanelProps {
  /** Visual variant controls layout of input area */
  variant?: QuestionPanelVariant;
  /** Visual density */
  density?: QuestionPanelDensity;
  /** Eyebrow label (e.g. "AI / CURRENT QUESTION") */
  eyebrow?: string;
  /** Field being asked about (e.g. "用途") */
  fieldLabel?: string;
  /** The question text */
  question: string;
  /** Clickable reference answer options */
  options?: QuestionPanelOption[];
  /** Whether "I don't know" / "不确定" option should be shown */
  showUncertain?: boolean;
  /** Placeholder for free-text input */
  placeholder?: string;
  /** Current answer value */
  value?: string;
  /** Change handler for text input */
  onValueChange?: (value: string) => void;
  /** Click handler for option buttons */
  onOptionSelect?: (value: string) => void;
  /** Submit button label */
  submitLabel?: string;
  /** Submit click handler */
  onSubmit?: () => void;
  /** Progress display: current / total */
  progress?: { current: number; total: number };
  /** Missing field indicator text */
  missingField?: string;
  /** Submitting state */
  submitting?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Whether back navigation is possible */
  canGoBack?: boolean;
  /** Back click handler */
  onBack?: () => void;
  className?: string;
}

/**
 * QuestionPanel renders the AI follow-up question area on the right side
 * of the workbench.
 *
 * - choice:  shows clickable option buttons + text input fallback
 * - text:    shows only the text input
 * - completed: shows a completion message with back navigation
 *
 * All usability features are preserved:
 * - Natural language question as headline
 * - Clickable reference answers
 * - "不确定" (uncertain) option
 * - Progress tracker (问题 01 / 01)
 * - Missing field indicator
 * - Clear primary action button
 */
export default function QuestionPanel({
  variant = "choice",
  density = "comfortable",
  eyebrow = "AI / CURRENT QUESTION",
  fieldLabel,
  question,
  options = [],
  showUncertain = false,
  placeholder = "输入你的回答…",
  value = "",
  onValueChange,
  onOptionSelect,
  submitLabel = "确认织入",
  onSubmit,
  progress,
  missingField,
  submitting = false,
  disabled = false,
  canGoBack = false,
  onBack,
  className,
}: QuestionPanelProps) {
  const cx = [
    "qpanel",
    `qpanel--${variant}`,
    `qpanel--${density}`,
  ];
  if (className) cx.push(className);

  const hasActiveInput = variant === "choice" || variant === "text";

  return (
    <div className={cx.join(" ")}>
      {(eyebrow || fieldLabel) && (
        <div className="qpanel__label">
          <span>{eyebrow}</span>
          {fieldLabel && <span className="qpanel__field">{fieldLabel}</span>}
        </div>
      )}

      <p className="qpanel__question">{question}</p>

      {variant === "choice" && hasActiveInput && (
        <>
          {options.length > 0 && (
            <div className="qpanel__options">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={[
                    "qpanel__option",
                    value === opt.value ? "qpanel__option--selected" : "",
                  ].join(" ")}
                  onClick={() => {
                    onOptionSelect?.(opt.value);
                    onValueChange?.(opt.value);
                  }}
                  disabled={disabled || submitting}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          <div className="qpanel__input-row">
            <input
              type="text"
              value={value}
              onChange={(e) => onValueChange?.(e.target.value)}
              placeholder={placeholder}
              disabled={disabled || submitting}
              className="qpanel__text-input"
              aria-label="AI 追问回答"
            />
            <button
              type="button"
              className="qpanel__submit"
              onClick={onSubmit}
              disabled={!value.trim() || disabled || submitting}
            >
              {submitLabel}
            </button>
          </div>

          {showUncertain && (
            <button
              type="button"
              className="qpanel__uncertain"
              onClick={() => onValueChange?.("不确定")}
              disabled={disabled || submitting}
            >
              不确定
            </button>
          )}
        </>
      )}

      {variant === "text" && hasActiveInput && (
        <div className="qpanel__input-row">
          <input
            type="text"
            value={value}
            onChange={(e) => onValueChange?.(e.target.value)}
            placeholder={placeholder}
            disabled={disabled || submitting}
            className="qpanel__text-input"
            aria-label="AI 追问回答"
          />
          <button
            type="button"
            className="qpanel__submit"
            onClick={onSubmit}
            disabled={!value.trim() || disabled || submitting}
          >
            {submitLabel}
          </button>
        </div>
      )}

      {variant === "completed" && (
        <div className="qpanel__completed">
          <span>问答已完成</span>
          {canGoBack && (
            <button
              type="button"
              className="qpanel__back"
              onClick={onBack}
              disabled={disabled}
            >
              ← 返回上一题
            </button>
          )}
        </div>
      )}

      {(progress || missingField) && (
        <div className="qpanel__progress">
          {progress && (
            <span>
              问题 {progress.current}/{progress.total}
            </span>
          )}
          {missingField && <span>缺失字段 · {missingField}</span>}
        </div>
      )}
    </div>
  );
}
