"use client";

import "./StatusMark.css";

export type StatusMarkVariant = "confirmed" | "identified" | "inferred" | "missing";
export type StatusMarkSize = "sm" | "md";

export interface StatusMarkProps {
  /** Status determines dot style and color */
  status: StatusMarkVariant;
  /** Label text shown alongside the dot */
  label?: string;
  /** Size: sm = 10px, md = 14px */
  size?: StatusMarkSize;
  /** Tooltip / aria-label — defaults to translated label */
  title?: string;
  className?: string;
}

const STATUS_LABELS: Record<StatusMarkVariant, string> = {
  confirmed: "已确认",
  identified: "已识别",
  inferred: "推测",
  missing: "缺失",
};

/**
 * StatusMark renders a colored status dot with optional label text.
 * Uses the white-on-yellow dot style within the .bunana-ui scope.
 *
 * - confirmed:  filled white dot on yellow field
 * - identified: white outline, transparent fill
 * - inferred:   dashed white outline, transparent fill
 * - missing:    dashed muted outline, transparent fill, slightly smaller
 */
export default function StatusMark({
  status,
  label,
  size = "md",
  title,
  className,
}: StatusMarkProps) {
  const cx = [
    "smark",
    `smark--${status}`,
    `smark--${size}`,
  ];
  if (className) cx.push(className);

  const displayLabel = label ?? STATUS_LABELS[status];
  const ariaLabel = title ?? STATUS_LABELS[status];

  return (
    <span className={cx.join(" ")} title={ariaLabel} aria-label={ariaLabel}>
      <span className="smark__dot" aria-hidden={label ? undefined : true} />
      {label && <span className="smark__label">{displayLabel}</span>}
    </span>
  );
}

export { STATUS_LABELS };
