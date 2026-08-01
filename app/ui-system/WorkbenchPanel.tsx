"use client";

import "./WorkbenchPanel.css";

export type WorkbenchPanelDensity = "comfortable" | "compact";

export interface WorkbenchPanelProps {
  /** Visual density */
  density?: WorkbenchPanelDensity;
  /** Eyebrow label (e.g. "INPUT CHANNEL") */
  eyebrow?: string;
  /** Position indicator (e.g. "01—02") */
  label?: string;
  /** Upload zone prompt text */
  uploadPrompt?: string;
  /** Upload hint text */
  uploadHint?: string;
  /** Default text in the textarea */
  defaultText?: string;
  /** Character count display */
  charCount?: string;
  /** Helper note text */
  note?: string;
  /** Primary action button label */
  actionLabel?: string;
  /** Primary action trailing label (e.g. "WEAVE →") */
  actionTrailing?: string;
  /** Textarea value (controlled) or undefined for uncontrolled */
  value?: string;
  /** Change handler */
  onValueChange?: (value: string) => void;
  /** File input change handler */
  onFilesChange?: (files: FileList) => void;
  /** Primary action click handler */
  onActionClick?: () => void;
  /** Disabled state */
  disabled?: boolean;
  className?: string;
}

/**
 * WorkbenchPanel renders the fabric input side of the workbench:
 * an upload zone, a text textarea, helper text, and a primary action.
 *
 * All usability notes, natural-language examples, and the "at least
 * one required" hint are preserved as configurable props.
 */
export default function WorkbenchPanel({
  density = "comfortable",
  eyebrow = "INPUT CHANNEL",
  label = "01—02",
  uploadPrompt = "上传布料照片",
  uploadHint = "拖入或选择 1–3 张 · JPG / PNG",
  defaultText = "",
  charCount = "0 / 1200",
  note = "图片和文字至少填一项",
  actionLabel = "开始织卡",
  actionTrailing = "WEAVE →",
  value,
  onValueChange,
  onFilesChange,
  onActionClick,
  disabled = false,
  className,
}: WorkbenchPanelProps) {
  const cx = ["wpanel", `wpanel--${density}`];
  if (className) cx.push(className);

  return (
    <div className={cx.join(" ")}>
      {(eyebrow || label) && (
        <div className="wpanel__header">
          {eyebrow && <span>{eyebrow}</span>}
          {label && <span className="wpanel__position">{label}</span>}
        </div>
      )}

      <div className="wpanel__input-stack">
        <label className="wpanel__upload" htmlFor="wpanel-file-input">
          <span className="wpanel__upload-index">01 / IMAGE</span>
          <span className="wpanel__upload-prompt">{uploadPrompt}</span>
          <span className="wpanel__upload-hint">{uploadHint}</span>
        </label>
        <input
          id="wpanel-file-input"
          type="file"
          accept="image/*"
          multiple
          disabled={disabled}
          onChange={(e) => onFilesChange?.(e.target.files as FileList)}
          className="wpanel__file-input"
        />

        <label className="wpanel__field-label" htmlFor="wpanel-text-input">
          02 / TEXT DESCRIPTION
        </label>
        <textarea
          id="wpanel-text-input"
          defaultValue={defaultText}
          value={value}
          onChange={(e) => onValueChange?.(e.target.value)}
          disabled={disabled}
          maxLength={1200}
          rows={4}
          className="wpanel__textarea"
          aria-describedby="wpanel-text-note"
        />
        <div id="wpanel-text-note" className="wpanel__note">
          <span>{note}</span>
          <span>{charCount}</span>
        </div>
      </div>

      <button
        type="button"
        className="wpanel__action"
        onClick={onActionClick}
        disabled={disabled}
      >
        <span>{actionLabel}</span>
        {actionTrailing && <span>{actionTrailing}</span>}
      </button>
    </div>
  );
}
