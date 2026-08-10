"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { RequirementRow } from "@/app/lib/supabase/requirements";
import { useI18n, LOCALE_TO_DATE } from "@/app/i18n";
import styles from "../square.module.css";

/* ----- 从 specs 中解析 14 字段规格项 ----- */
function parseSpecsIntoGrid(specs: string, specLabel: string): { label: string; value: string }[] {
  if (!specs || specs === "待确认" || specs === "TBD" || specs === "未定" || specs === "미정") return [];
  return specs
    .split(/[，,、]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => ({ label: s.length > 6 ? s.slice(0, 6) : specLabel, value: s }));
}

function estimateConfirmedCount(item: RequirementRow): number {
  const meaningfulKeywords = item.keywords.filter(
    (kw) => kw !== item.fabricName && kw.length > 0
  );
  const specParts =
    item.specs && item.specs !== "待确认"
      ? item.specs.split(/[，,、]/).filter((s) => s.trim().length > 0)
      : [];
  return meaningfulKeywords.length + specParts.length;
}

export default function SquareDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t, locale } = useI18n();
  const id = params.id as string;

  const [item, setItem] = useState<RequirementRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function fetchDetail() {
      try {
        const resp = await fetch(
          `/api/bunana/requirements?id=${encodeURIComponent(id)}`
        );
        const data = await resp.json();
        if (cancelled) return;
        if (!data.success || !data.requirement) {
          setError(data.error ?? t("squareDetail.notFound"));
          return;
        }
        setItem(data.requirement);
      } catch (e) {
        if (!cancelled) setError(t("squareDetail.networkError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchDetail();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleDemandIntent = () => {
    if (!item) return;
    router.push(`/chat/${item.id}?role=buyer`);
  };

  const handleSupplyIntent = () => {
    if (!item) return;
    router.push(`/chat/${item.id}?role=supplier`);
  };

  if (loading) {
    return (
      <main className={styles.detailPage}>
        <p className={styles.loading}>{t("squareDetail.loading")}</p>
      </main>
    );
  }

  if (error || !item) {
    return (
      <main className={styles.detailPage}>
        <div className="error-banner">{error || t("squareDetail.recordNotExist")}</div>
        <Link
          href="/square"
          className={styles.detailBack}
          style={{ marginTop: 16 }}
        >
          {t("squareDetail.backToDatabase")}
        </Link>
      </main>
    );
  }

  const specsGrid = parseSpecsIntoGrid(item.specs, t("squareDetail.specLabel"));
  const confirmedCount = estimateConfirmedCount(item);

  return (
    <main className={styles.detailPage}>
      <Link href="/square" className={styles.detailBack}>
        {t("squareDetail.backToDatabase")}
      </Link>

      <div className={styles.detailCard}>
        {/* Image — full width */}
        {item.images.length > 0 ? (
          <div className={styles.detailImage}>
            <img
              src={item.images[0].url}
              alt={item.fabricName}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        ) : (
          <div className={styles.detailImage}>
            <div
              style={{
                width: "100%",
                height: "100%",
                background:
                  "linear-gradient(135deg, var(--color-surface) 0%, var(--color-brand-50) 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "4rem",
                opacity: 0.2,
              }}
            >
              🧵
            </div>
          </div>
        )}

        <div className={styles.detailBody}>
          {/* Header: name + DNA badge */}
          <div className={styles.detailHeader}>
            <h1 className={styles.detailName}>
              {item.fabricName || t("squareDetail.unnamedFabric")}
            </h1>
            <span className={styles.detailDnaBadge}>FABRIC DNA</span>
          </div>

          {/* Meta: provider + confirmed count */}
          <div className={styles.detailMeta}>
            <span className={styles.detailProvider}>{item.aiProvider}</span>
            <span className={styles.detailConfirmed}>
              {t("squareDetail.aiConfirmed", { n: confirmedCount })}
            </span>
          </div>

          {/* Keywords */}
          {item.keywords.length > 0 && (
            <div className={styles.detailSection}>
              <h2 className={styles.detailSectionTitle}>{t("squareDetail.tags")}</h2>
              <div className={styles.detailKeywords}>
                {item.keywords.map((kw) => (
                  <span key={kw} className={styles.detailKeyword}>
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Specs — 2-column grid (14 字段) */}
          {specsGrid.length > 0 && (
            <div className={styles.detailSection}>
              <h2 className={styles.detailSectionTitle}>{t("squareDetail.specs")}</h2>
              <div className={styles.specsGrid}>
                {specsGrid.map((spec, i) => (
                  <div key={i} className={styles.specItem}>
                    <span className={styles.specLabel}>{spec.label}</span>
                    <span className={styles.specValue}>{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {item.summary && (
            <div className={styles.detailSection}>
              <h2 className={styles.detailSectionTitle}>{t("squareDetail.summary")}</h2>
              <p className={styles.detailSummary}>{item.summary}</p>
            </div>
          )}

          {/* Date */}
          <div className={styles.detailDate}>
            {item.createdAt
              ? `${t("squareDetail.publishedAt")} ${new Date(item.createdAt).toLocaleString(LOCALE_TO_DATE[locale])}`
              : ""}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className={styles.detailActions}>
        <button
          className={styles.detailNeedBtn}
          onClick={handleDemandIntent}
        >
          {t("squareDetail.needFabric")}
        </button>
        <button
          className={styles.detailHaveBtn}
          onClick={handleSupplyIntent}
        >
          {t("squareDetail.haveFabric")}
        </button>
      </div>
    </main>
  );
}
