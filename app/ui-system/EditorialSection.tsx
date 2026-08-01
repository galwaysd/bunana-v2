"use client";

import "./EditorialSection.css";

export type EditorialSectionVariant = "hero" | "workbench" | "dna" | "square";
export type EditorialSectionSurface = "brand" | "paper";

export interface EditorialSectionProps {
  /** Visual variant — adjusts border, padding, and internal context */
  variant?: EditorialSectionVariant;
  /** Background surface: brand=yellow field, paper=white canvas */
  surface?: EditorialSectionSurface;
  /** Section id for scroll targeting */
  id?: string;
  /** Eyebrow label (e.g. "#02 / WORKBENCH") */
  eyebrow?: string;
  /** Section heading */
  heading: React.ReactNode;
  /** Optional description text */
  description?: React.ReactNode;
  /** When true, forces the section to fit within one viewport on desktop (>=900px) */
  fitViewport?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/**
 * EditorialSection is the outer frame for every major content block.
 * It provides the editorial column, top/bottom borders, and surface context.
 *
 * - hero:     no eyebrow/heading (content provided by children), full bleed
 * - workbench: yellow field with thick white frame
 * - dna:      white canvas on yellow field, inverted text context
 * - square:   yellow field, white canvas cards inside
 */
export default function EditorialSection({
  variant = "workbench",
  surface = "brand",
  id,
  eyebrow,
  heading,
  description,
  fitViewport = false,
  className,
  children,
}: EditorialSectionProps) {
  const cx = [
    "esection",
    `esection--${variant}`,
    `esection--${surface}`,
  ];
  if (fitViewport) cx.push("esection--fit-viewport");
  if (className) cx.push(className);

  return (
    <section
      id={id}
      className={cx.join(" ")}
      data-variant={variant}
      data-surface={surface}
    >
      <header className="esection__head">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        {heading && <div className="esection__heading">{heading}</div>}
        {description && (
          <p className="esection__description">{description}</p>
        )}
      </header>
      <div className="esection__frame">{children}</div>
    </section>
  );
}
