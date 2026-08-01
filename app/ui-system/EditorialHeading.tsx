"use client";

import "./EditorialHeading.css";

export type EditorialHeadingSize = "display" | "h2" | "h3" | "subhead";
export type EditorialHeadingWeight = "regular" | "medium" | "bold";

export interface EditorialHeadingProps {
  /** Visual size determines font-size and line-height */
  size?: EditorialHeadingSize;
  /** Font weight */
  weight?: EditorialHeadingWeight;
  /** Optional subtitle — rendered as a second line, italic */
  subtitle?: string;
  /** When true, renders as <h2>; otherwise <p> (for eyebrows etc.) */
  tag?: "h1" | "h2" | "h3" | "p";
  className?: string;
  children: React.ReactNode;
}

/**
 * EditorialHeading is the display heading component.
 * Uses the serif face (Didot/Bodoni) by default for personality.
 * The subtitle is rendered as a second line in italic serif.
 */
export default function EditorialHeading({
  size = "h2",
  weight = "medium",
  subtitle,
  tag = "h2",
  className,
  children,
}: EditorialHeadingProps) {
  const cx = ["eheading", `eheading--${size}`, `eheading--${weight}`];
  if (className) cx.push(className);

  const Tag = tag;

  if (subtitle) {
    return (
      <Tag className={cx.join(" ")}>
        <span>{children}</span>
        <span className="eheading__subtitle">{subtitle}</span>
      </Tag>
    );
  }

  return <Tag className={cx.join(" ")}>{children}</Tag>;
}
