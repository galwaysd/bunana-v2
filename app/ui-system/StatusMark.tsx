"use client";

import "./StatusMark.css";
import { useI18n } from "@/app/i18n";

export type StatusMarkVariant = "confirmed" | "identified" | "inferred" | "missing";
export type StatusMarkSize = "sm" | "md";

export interface StatusMarkProps {
  /** Status determines dot style and color */
  status: StatusMarkVariant;
  /** Label text shown alongside the dot (overrides i18n default) */
  label?: string;
  /** Size: sm = 10px, md = 14px */
  size?: StatusMarkSize;
  /** Tooltip / aria-label — defaults to translated label */
  title?: string;
  className?: string;
}

const STATUS_LABEL_KEYS: Record<StatusMarkVariant, string> = {
  confirmed: "status.confirmed",
  identified: "status.identified",
  inferred: "status.inferred",
  missing: "status.missing",
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
  const { t } = useI18n();
  const cx = [
    "smark",
    `smark--${status}`,
    `smark--${size}`,
  ];
  if (className) cx.push(className);

  const defaultLabel = t(STATUS_LABEL_KEYS[status]);
  const displayLabel = label ?? defaultLabel;
  const ariaLabel = title ?? defaultLabel;

  return (
    <span className={cx.join(" ")} title={ariaLabel} aria-label={ariaLabel}>
      <span className="smark__dot" aria-hidden={label ? undefined : true} />
      {label && <span className="smark__label">{displayLabel}</span>}
    </span>
  );
}

export { STATUS_LABEL_KEYS };
