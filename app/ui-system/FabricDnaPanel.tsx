"use client";

import Image from "next/image";
import "./FabricDnaPanel.css";
import StatusMark from "./StatusMark";
import type { StatusMarkVariant } from "./StatusMark";

export type FabricDnaPanelVariant = "archive" | "compact";
export type FabricDnaPanelDensity = "comfortable" | "compact";

export interface DnaField {
  label: string;
  value: string;
  status: StatusMarkVariant;
}

export interface FabricDnaPanelProps {
  /** Visual variant */
  variant?: FabricDnaPanelVariant;
  /** Visual density */
  density?: FabricDnaPanelDensity;
  /** Card ID (e.g. "NO. 00210D") */
  cardId?: string;
  /** Card title (e.g. "FABRIC DNA / IDENTITY ARCHIVE") */
  title?: string;
  /** Identity band fields */
  identity?: Array<{ label: string; value: string; status: StatusMarkVariant }>;
  /** Spec fields */
  fields: DnaField[];
  /** Footer counts */
  footer?: Array<{ label: string; count: number }>;
  /** Swatch image */
  swatchImage?: {
    src: string;
    alt: string;
    label?: string;
  };
  /** Status legend items */
  statusLegend?: Array<{ status: StatusMarkVariant; label: string }>;
  /** Whether to show the status legend (archive variant only) */
  showLegend?: boolean;
  /** Layout grid columns: [introCols, cardCols] e.g. [4, 8] for 12-col grid */
  introColumn?: [number, number];
  className?: string;
}

/**
 * FabricDnaPanel renders the white-canvas Fabric DNA identity card.
 *
 * - archive: full card with swatch, legend, identity band, spec fields, footer
 * - compact: only identity band + spec fields (no swatch/legend)
 *
 * In archive variant, the intro (swatch + legend) and card body are laid
 * out side-by-side using a 12-column grid.
 */
export default function FabricDnaPanel({
  variant = "archive",
  density = "comfortable",
  cardId = "NO. —",
  title = "FABRIC DNA / IDENTITY ARCHIVE",
  identity = [],
  fields = [],
  footer = [],
  swatchImage,
  statusLegend,
  showLegend = true,
  introColumn = [1, 5],
  className,
}: FabricDnaPanelProps) {
  const cx = ["dna-panel", `dna-panel--${variant}`, `dna-panel--${density}`];
  if (className) cx.push(className);

  const showIntro =
    variant === "archive" && (swatchImage || (showLegend && statusLegend));

  if (!showIntro && variant === "archive") {
    // Archive with no intro — just render the card
    return (
      <div className={cx.join(" ")}>
        <FabricDnaCard
          title={title}
          cardId={cardId}
          identity={identity}
          fields={fields}
          footer={footer}
        />
      </div>
    );
  }

  if (!showIntro) {
    return (
      <div className={cx.join(" ")}>
        <FabricDnaCard
          title={title}
          cardId={cardId}
          identity={identity}
          fields={fields}
          footer={footer}
        />
      </div>
    );
  }

  return (
    <div
      className={cx.join(" ")}
      style={{
        "--intro-start": introColumn[0],
        "--intro-end": introColumn[1],
      } as React.CSSProperties}
    >
      <header className="dna-panel__intro">
        {swatchImage && (
          <div className="dna-panel__swatch">
            <Image
              src={swatchImage.src}
              alt={swatchImage.alt}
              fill
              sizes="(max-width: 760px) 100vw, 34vw"
              style={{ objectFit: "cover", objectPosition: "26% 48%" }}
            />
            {swatchImage.label && (
              <span className="dna-panel__swatch-label">
                {swatchImage.label}
              </span>
            )}
          </div>
        )}

        {showLegend && statusLegend && (
          <div className="dna-panel__legend">
            {statusLegend.map((item) => (
              <div key={item.status} className="dna-panel__legend-item">
                <StatusMark status={item.status} size="sm" />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        )}
      </header>

      <FabricDnaCard
        title={title}
        cardId={cardId}
        identity={identity}
        fields={fields}
        footer={footer}
      />
    </div>
  );
}

/** Internal: the white card with header, identity, fields, footer */
function FabricDnaCard({
  title,
  cardId,
  identity,
  fields,
  footer,
}: {
  title: string;
  cardId: string;
  identity: FabricDnaPanelProps["identity"];
  fields: DnaField[];
  footer: FabricDnaPanelProps["footer"];
}) {
  return (
    <div className="dna-panel__card">
      {(title || cardId) && (
        <header className="dna-panel__card-header">
          {title && <strong>{title}</strong>}
          {cardId && <span>{cardId}</span>}
        </header>
      )}

      {(identity && identity.length > 0) || (fields && fields.length > 0) ? (
        <>
          {identity && identity.length > 0 && (
            <div className="dna-panel__identity">
              {identity.map((item) => (
                <div key={item.label} className="dna-panel__identity-row">
                  <span>{item.label}</span>
                  <strong>{item.value || "—"}</strong>
                  <StatusMark status={item.status} size="sm" />
                </div>
              ))}
            </div>
          )}

          {fields && fields.length > 0 && (
            <div className="dna-panel__fields">
              {fields.map((field) => (
                <div key={field.label} className="dna-panel__field">
                  <span>{field.label}</span>
                  <strong>{field.value || "—"}</strong>
                  <StatusMark status={field.status} size="sm" />
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}

      {footer && footer.length > 0 && (
        <footer className="dna-panel__footer">
          {footer.map((item) => (
            <span key={item.label}>
              {item.label} {item.count}
            </span>
          ))}
        </footer>
      )}
    </div>
  );
}
